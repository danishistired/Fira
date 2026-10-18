"""
Investigation orchestrator for ARGUS agentic engine.

The main loop that coordinates planner, tool registry, and memory
to dynamically investigate each APK based on evidence and reasoning.

The orchestrator:
1. Always starts with manifest extraction (foundational step)
2. Asks the planner to reflect, hypothesize, and decide the next tool
3. Tracks budget expenditure per tool cost
4. Records journal entries with the planner's full reasoning
5. Builds correlation matrix from accumulated evidence
6. Generates consensus verdict via LLM
7. Builds backward-compatible response JSON with new agentic fields
"""

import json

from engine.memory import InvestigationMemory
from engine.planner import Planner
from engine.prompts import build_consensus_system_prompt
from shared.language import parse_llm_json, enforce_language_on_findings, log_llm_prompt
from shared.scoring import compute_risk_score
from shared.evidence import build_correlation_matrix


# Maximum investigation budget (cost units, not iterations).
# very_low=1, low=2, medium=4, high=6
# A full investigation (manifest+perms+jadx+frida+monkey) costs ~18 units
MAX_BUDGET = 30


class InvestigationOrchestrator:
    """The agentic investigation loop.

    Each APK produces a different investigation path based on evidence.
    The planner reflects and reasons at every step. Budget and hypotheses
    evolve across iterations.
    """

    def __init__(self, llm_client, tool_registry):
        self.llm_client = llm_client
        self.tools = tool_registry
        self.planner = Planner(llm_client)

    def investigate(self, apk_path: str) -> dict:
        """Run the full agentic investigation.

        Returns the same JSON shape as the old pipeline, plus new
        agentic fields (journal, hypotheses, confidence_history).
        """
        memory = InvestigationMemory(apk_path=apk_path)

        print(f"\n{'='*60}", flush=True)
        print(f"[Orchestrator] Starting agentic investigation: {apk_path}", flush=True)

        # ---- Step 1: Always extract manifest first ----
        memory.iteration = 1
        print(f"[Orchestrator] Iteration 1: extract_manifest (foundational)", flush=True)
        manifest_result = self.tools.execute("extract_manifest", apk_path=apk_path)
        memory.add_tool_result("extract_manifest", manifest_result)
        memory.record_budget_cost("very_low")
        memory.add_decision("extract_manifest", "Foundational step — manifest is always required",
                          manifest_result.get("summary", "Manifest extracted"))

        # Record initial journal entry
        memory.add_journal_entry({
            "thought": "Beginning investigation. Manifest extraction is always the first step to understand the app's declared capabilities and attack surface.",
            "action": "extract_manifest",
            "reason": "Foundational step — always required",
            "result": manifest_result.get("summary", ""),
            "confidence": 10,
        })
        memory.record_confidence(10, "Initial — manifest extracted but no analysis yet")

        # If no LLM available, fall back to fixed pipeline
        if not self.llm_client:
            print("[Orchestrator] No LLM client — falling back to fixed pipeline", flush=True)
            return self._fallback_pipeline(memory)

        # ---- Step 2+: Agentic investigation loop ----
        MAX_ITERATIONS = 15  # Safety cap even with budget system
        for iteration in range(2, MAX_ITERATIONS + 1):
            memory.iteration = iteration
            budget = memory.get_budget_status(MAX_BUDGET)

            # Budget exhaustion check
            if budget["budget_exhausted"]:
                print(f"[Orchestrator] Budget exhausted ({budget['budget_spent']}/{MAX_BUDGET}). Forcing report.", flush=True)
                memory.status = "complete"
                break

            # Ask the planner to reflect, reason, and decide
            decision = self.planner.decide(memory, self.tools)
            action = decision["action"]
            arguments = decision.get("arguments", {})
            reason = decision.get("reason", "")

            print(f"[Orchestrator] Iteration {iteration}: {action} — {reason}", flush=True)

            # Terminal condition: planner says "generate_report"
            if action == "generate_report":
                memory.add_decision(action, reason, "Investigation complete")
                memory.status = "complete"
                break

            # Execute the tool
            result = self.tools.execute(action, **arguments)
            memory.add_tool_result(action, result)
            memory.add_decision(action, reason, result.get("summary", "Tool executed"))

            # Track budget cost from tool metadata
            tool_cost = self._get_tool_cost(action)
            memory.record_budget_cost(tool_cost)

        else:
            print(f"[Orchestrator] Hit iteration cap ({MAX_ITERATIONS}). Forcing report.", flush=True)
            memory.status = "complete"

        # ---- Step 3: Build correlation matrix ----
        memory.correlation_matrix = build_correlation_matrix(
            memory.api_calls, memory.raw_dynamic_logs, memory.sandbox_status
        )

        # ---- Step 4: Generate consensus verdict via LLM ----
        consensus = self._generate_consensus(memory)

        # ---- Step 5: Build response ----
        return self._build_response(memory, consensus)

    def _get_tool_cost(self, tool_name: str) -> str:
        """Look up a tool's cost from its metadata."""
        try:
            tool = self.tools.get(tool_name)
            return tool.metadata.get("estimated_cost", "low")
        except KeyError:
            return "low"

    def _generate_consensus(self, memory: InvestigationMemory) -> dict:
        """Generate the final verdict and agent findings using the consensus prompt."""
        if not self.llm_client:
            return None

        dynamic_ran = memory.coverage.get("runtime_frida", False)
        scope_str = "Static + Dynamic analysis" if dynamic_ran else "Static analysis ONLY (no runtime/dynamic analysis was performed)"
        system_prompt = build_consensus_system_prompt(scope_str)

        # Build evidence summary for the consensus engine
        evidence_summary = memory.get_planner_summary()

        # Add correlation data
        correlation_lines = []
        validated = [c for c in memory.correlation_matrix if c['status'] == 'VALIDATED']
        not_validated = [c for c in memory.correlation_matrix if c['status'] == 'NOT_VALIDATED']
        not_tested = [c for c in memory.correlation_matrix if c['status'] == 'NOT_TESTED']

        correlation_lines.append(f"\n## Correlation Matrix")
        correlation_lines.append(f"- Validated: {len(validated)}")
        correlation_lines.append(f"- Not Validated: {len(not_validated)}")
        correlation_lines.append(f"- Not Tested: {len(not_tested)}")
        if validated:
            for c in validated:
                correlation_lines.append(f"  - VALIDATED: {c['capability']}: {c['static_evidence']} → {c['dynamic_evidence']}")
        if not_validated:
            for c in not_validated:
                correlation_lines.append(f"  - NOT_VALIDATED: {c['capability']}: {c['static_evidence']}")

        # Add code snippets if available
        snippet_lines = []
        if memory.code_snippets:
            snippet_lines.append(f"\n## Code Snippets")
            for s in memory.code_snippets[:5]:
                snippet_lines.append(f"\n--- {s['file']} (line {s['line']}, API: {s['api']}) ---")
                snippet_lines.append(f"```java\n{s['code']}\n```")

        # Risk score
        risk_score = compute_risk_score(
            memory.permissions, memory.high_risk_permissions,
            memory.api_calls, memory.manifest_vulnerabilities,
            memory.hardcoded_secrets, memory.raw_dynamic_logs
        )

        # Investigation hypotheses (provide to consensus for context)
        hypothesis_lines = []
        if memory.hypotheses:
            hypothesis_lines.append(f"\n## Investigation Hypotheses")
            for h in memory.hypotheses:
                hypothesis_lines.append(f"- [{h.get('status', '?').upper()}] {h['hypothesis']} ({h.get('confidence', 0)}%)")

        # Investigation timeline
        timeline_lines = ["\n## Investigation Timeline"]
        for d in memory.decisions:
            timeline_lines.append(f"- Step {d['iteration']}: {d['action']} — {d['reason']}")

        user_message = (
            evidence_summary +
            "\n".join(correlation_lines) +
            "\n".join(snippet_lines) +
            "\n".join(hypothesis_lines) +
            "\n".join(timeline_lines) +
            f"\n\n**Rule-based risk score**: {risk_score}%"
            f"\n**Package**: {memory.package_name}"
        )

        max_attempts = 2
        for attempt in range(1, max_attempts + 1):
            try:
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ]
                if attempt == 1:
                    log_llm_prompt("Consensus (Agentic)", messages)

                print(f"[Orchestrator] Requesting consensus verdict (attempt {attempt})...", flush=True)
                response = self.llm_client.chat.completions.create(
                    model="deepseek-v4-flash",
                    messages=messages,
                    temperature=0.2 + (attempt - 1) * 0.1,
                    max_tokens=4096,
                )
                raw = response.choices[0].message.content.strip()
                print(f"[Orchestrator] Consensus received ({len(raw)} chars)", flush=True)

                consensus = parse_llm_json(raw)
                consensus = enforce_language_on_findings(consensus)
                return consensus

            except Exception as e:
                print(f"[Orchestrator] Consensus error (attempt {attempt}): {type(e).__name__}: {e}", flush=True)
                if attempt == max_attempts:
                    return None

    def _build_response(self, memory: InvestigationMemory, consensus: dict) -> dict:
        """Build the response JSON — backward compatible + new agentic fields."""
        dynamic_ran = memory.coverage.get("runtime_frida", False)
        analysis_scope = "static_and_dynamic" if dynamic_ran else "static_only"

        risk_score = compute_risk_score(
            memory.permissions, memory.high_risk_permissions,
            memory.api_calls, memory.manifest_vulnerabilities,
            memory.hardcoded_secrets, memory.raw_dynamic_logs
        )

        # Pipeline status (backward compat)
        pipeline_status = {
            "apktool": {
                "success": memory.coverage.get("apktool_resources", False),
                "message": "APKTool extraction successful" if memory.coverage.get("apktool_resources") else "Planner decided to skip",
            },
            "jadx": {
                "success": memory.coverage.get("source_code", False),
                "message": "JADX decompilation successful" if memory.coverage.get("source_code") else "Planner decided to skip",
            },
            "sandbox": memory.sandbox_status,
        }

        result = {
            # Existing fields (backward compatible)
            "package": memory.package_name,
            "permissions": memory.permissions,
            "high_risk_permissions": memory.high_risk_permissions,
            "api_calls": memory.api_calls,
            "manifest_vulnerabilities": memory.manifest_vulnerabilities,
            "hardcoded_secrets": memory.hardcoded_secrets,
            "dynamic_logs": memory.raw_dynamic_logs if dynamic_ran else None,
            "correlations": memory.correlation_matrix,
            "pipeline_status": pipeline_status,
            "permission_score_percent": risk_score,
            "analysis_scope": analysis_scope,

            # Agentic investigation metadata
            "investigation_timeline": memory.decisions,
            "investigation_iterations": memory.iteration,
            "investigation_coverage": memory.get_coverage_report(),

            # NEW: Agentic reasoning data (for frontend investigation journal)
            "investigation_journal": memory.journal,
            "investigation_hypotheses": memory.hypotheses,
            "confidence_history": memory.confidence_history,
            "knowledge_gaps": memory.knowledge_gaps,
            "investigation_budget": memory.get_budget_status(MAX_BUDGET),
        }

        # Add consensus/LLM results if available
        if consensus:
            result["verdict"] = consensus.get("verdict")
            result["confidence"] = consensus.get("confidence")
            result["confidence_breakdown"] = consensus.get("confidence_breakdown")
            result["executive_summary"] = consensus.get("executive_summary")
            result["analyst_summary"] = consensus.get("analyst_summary")
            result["recommended_actions"] = consensus.get("recommended_actions")
            result["mitre_techniques"] = consensus.get("mitre_techniques", [])

            agent_findings = consensus.get("agent_findings", {})
            for agent_id in ["perm", "code", "network", "threat", "behavior"]:
                if agent_id in agent_findings:
                    agent_data = agent_findings[agent_id]
                    if "summary" not in agent_data:
                        agent_data["summary"] = "Analysis complete"
                    if "detail" not in agent_data and "findings" in agent_data:
                        details = []
                        for f in agent_data.get("findings", [])[:3]:
                            interp = f.get("interpretation", f.get("evidence", ""))
                            conf = f.get("confidence", "")
                            validation = f.get("runtime_validation", "NOT_TESTED")
                            details.append(f"[{conf}] {interp} (Validation: {validation})")
                        agent_data["detail"] = " ".join(details) if details else agent_data["summary"]
            result["agent_findings"] = agent_findings
        else:
            result["verdict"] = (
                "high-risk" if risk_score > 70 else
                "suspicious" if risk_score > 40 else
                "benign"
            )
            result["confidence"] = min(99, 60 + round(risk_score / 3))

        print(f"[Orchestrator] DONE — verdict={result.get('verdict')} "
              f"scope={analysis_scope} iterations={memory.iteration} "
              f"hypotheses={len(memory.hypotheses)} journal={len(memory.journal)}", flush=True)
        return result

    def _fallback_pipeline(self, memory: InvestigationMemory) -> dict:
        """Fallback: run all tools in fixed order when no LLM is available."""
        print("[Orchestrator] Running fallback pipeline (no LLM)...", flush=True)

        tools_to_run = [
            ("scan_permissions", {"apk_path": memory.apk_path}),
            ("run_apktool", {"apk_path": memory.apk_path}),
            ("run_jadx", {"apk_path": memory.apk_path}),
            ("run_frida", {"apk_path": memory.apk_path, "package_name": memory.package_name}),
        ]

        for tool_name, args in tools_to_run:
            memory.iteration += 1
            result = self.tools.execute(tool_name, **args)
            memory.add_tool_result(tool_name, result)
            memory.add_decision(tool_name, "Fallback pipeline — running all tools",
                              result.get("summary", "Done"))

        memory.status = "complete"
        memory.correlation_matrix = build_correlation_matrix(
            memory.api_calls, memory.raw_dynamic_logs, memory.sandbox_status
        )

        return self._build_response(memory, None)
