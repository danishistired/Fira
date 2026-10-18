"""
Investigation orchestrator for ARGUS agentic engine.

This is the main loop that replaces the fixed pipeline in app.py.
It coordinates the planner, tool registry, and investigation memory
to dynamically investigate each APK based on evidence.

The orchestrator:
1. Always starts with manifest extraction (the minimum viable step)
2. Asks the planner what to do next based on accumulated evidence
3. Executes the chosen tool
4. Records the result in memory
5. Repeats until the planner calls generate_report or iteration cap is hit
6. Generates the final consensus verdict and builds the response

The response JSON matches the exact shape the frontend expects.
"""

import json

from engine.memory import InvestigationMemory
from engine.planner import Planner
from engine.prompts import build_consensus_system_prompt
from shared.language import parse_llm_json, enforce_language_on_findings, log_llm_prompt
from shared.scoring import compute_risk_score
from shared.evidence import build_correlation_matrix


# Maximum investigation iterations (safety cap).
# Typical investigations use 3-8 iterations. The cap prevents runaway loops.
MAX_ITERATIONS = 15


class InvestigationOrchestrator:
    """The agentic investigation loop.

    Replaces the fixed pipeline in app.py with a dynamic loop where
    DeepSeek decides the next step based on accumulated evidence.
    Each APK produces a different investigation path.

    Usage:
        orchestrator = InvestigationOrchestrator(llm_client, tool_registry)
        result = orchestrator.investigate("/tmp/sample.apk")
        # result is the same JSON shape as the old /analyze response
    """

    def __init__(self, llm_client, tool_registry):
        self.llm_client = llm_client
        self.tools = tool_registry
        self.planner = Planner(llm_client)

    def investigate(self, apk_path: str) -> dict:
        """Run the full agentic investigation.

        This is the main entry point. It runs the investigation loop
        and returns the same JSON shape as the old pipeline.

        If the LLM is unavailable, falls back to the old fixed pipeline
        behavior (run all tools in order, skip LLM analysis).
        """
        memory = InvestigationMemory(apk_path=apk_path)

        print(f"\n{'='*60}", flush=True)
        print(f"[Orchestrator] Starting investigation: {apk_path}", flush=True)

        # ---- Step 1: Always extract manifest first ----
        # This is the minimum viable step. Every investigation starts here.
        memory.iteration = 1
        print(f"[Orchestrator] Iteration 1: extract_manifest (mandatory)", flush=True)
        manifest_result = self.tools.execute("extract_manifest", apk_path=apk_path)
        memory.add_tool_result("extract_manifest", manifest_result)
        memory.add_decision("extract_manifest", "First step — always extract manifest", 
                          manifest_result.get("summary", "Manifest extracted"))

        # If no LLM available, fall back to fixed pipeline
        if not self.llm_client:
            print("[Orchestrator] No LLM client — falling back to fixed pipeline", flush=True)
            return self._fallback_pipeline(memory)

        # ---- Step 2+: Agentic investigation loop ----
        for iteration in range(2, MAX_ITERATIONS + 1):
            memory.iteration = iteration

            # Ask the planner what to do next
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

        else:
            # Hit iteration cap without planner calling generate_report
            print(f"[Orchestrator] Hit iteration cap ({MAX_ITERATIONS}). Forcing report.", flush=True)
            memory.status = "complete"

        # ---- Step 3: Build correlation matrix ----
        memory.correlation_matrix = build_correlation_matrix(
            memory.api_calls, memory.raw_dynamic_logs, memory.sandbox_status
        )

        # ---- Step 4: Generate consensus verdict via LLM ----
        consensus = self._generate_consensus(memory)

        # ---- Step 5: Build response in the frontend-expected shape ----
        return self._build_response(memory, consensus)

    def _generate_consensus(self, memory: InvestigationMemory) -> dict:
        """Generate the final verdict and agent findings using the consensus prompt.

        This replaces run_static_agents() + run_behavior_agent() + run_consensus()
        from the old pipeline. A single LLM call produces ALL agent perspectives
        plus the final verdict.
        """
        if not self.llm_client:
            return None

        # Determine analysis scope
        dynamic_ran = memory.coverage.get("runtime_frida", False)
        scope_str = "Static + Dynamic analysis" if dynamic_ran else "Static analysis ONLY (no runtime/dynamic analysis was performed)"
        system_prompt = build_consensus_system_prompt(scope_str)

        # Build the evidence summary for the consensus engine
        evidence_summary = memory.get_planner_summary()

        # Add correlation data
        correlation_lines = []
        validated = [c for c in memory.correlation_matrix if c['status'] == 'VALIDATED']
        not_validated = [c for c in memory.correlation_matrix if c['status'] == 'NOT_VALIDATED']
        not_tested = [c for c in memory.correlation_matrix if c['status'] == 'NOT_TESTED']

        correlation_lines.append(f"\n## Correlation Matrix")
        correlation_lines.append(f"- Validated (confirmed at runtime): {len(validated)}")
        correlation_lines.append(f"- Not Validated (code exists, not triggered): {len(not_validated)}")
        correlation_lines.append(f"- Not Tested (no dynamic analysis): {len(not_tested)}")
        if validated:
            for c in validated:
                correlation_lines.append(f"  - VALIDATED: {c['capability']}: {c['static_evidence']} → {c['dynamic_evidence']}")
        if not_validated:
            for c in not_validated:
                correlation_lines.append(f"  - NOT_VALIDATED: {c['capability']}: {c['static_evidence']}")

        # Add code snippets if available (for the consensus engine to reference)
        snippet_lines = []
        if memory.code_snippets:
            snippet_lines.append(f"\n## Code Snippets (context around HIGH/MEDIUM findings)")
            for s in memory.code_snippets[:5]:
                snippet_lines.append(f"\n--- {s['file']} (line {s['line']}, API: {s['api']}) ---")
                snippet_lines.append(f"```java\n{s['code']}\n```")

        # Risk score
        risk_score = compute_risk_score(
            memory.permissions, memory.high_risk_permissions,
            memory.api_calls, memory.manifest_vulnerabilities,
            memory.hardcoded_secrets, memory.raw_dynamic_logs
        )

        # Investigation timeline
        timeline_lines = ["\n## Investigation Timeline"]
        for d in memory.decisions:
            timeline_lines.append(f"- Step {d['iteration']}: {d['action']} — {d['reason']}")

        user_message = (
            evidence_summary +
            "\n".join(correlation_lines) +
            "\n".join(snippet_lines) +
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
        """Build the response JSON in the exact shape the frontend expects.

        This is the backward-compatibility layer. The frontend sees no
        difference between the old pipeline and the new agentic engine.
        """
        dynamic_ran = memory.coverage.get("runtime_frida", False)
        analysis_scope = "static_and_dynamic" if dynamic_ran else "static_only"

        # Compute risk score
        risk_score = compute_risk_score(
            memory.permissions, memory.high_risk_permissions,
            memory.api_calls, memory.manifest_vulnerabilities,
            memory.hardcoded_secrets, memory.raw_dynamic_logs
        )

        # Build pipeline status (backward compat)
        pipeline_status = {
            "apktool": {
                "success": memory.coverage.get("apktool_resources", False),
                "message": "APKTool extraction successful" if memory.coverage.get("apktool_resources") else "Not run (planner decided to skip)",
            },
            "jadx": {
                "success": memory.coverage.get("source_code", False),
                "message": "JADX decompilation successful" if memory.coverage.get("source_code") else "Not run (planner decided to skip)",
            },
            "sandbox": memory.sandbox_status,
        }

        result = {
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
            # Investigation metadata (new — frontend can optionally display)
            "investigation_timeline": memory.decisions,
            "investigation_iterations": memory.iteration,
            "investigation_coverage": memory.get_coverage_report(),
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

            # Agent findings from consensus (replaces individual agent calls)
            agent_findings = consensus.get("agent_findings", {})

            # Ensure backward-compatible structure for each agent
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
            # No LLM — provide rule-based fallbacks
            result["verdict"] = (
                "high-risk" if risk_score > 70 else
                "suspicious" if risk_score > 40 else
                "benign"
            )
            result["confidence"] = min(99, 60 + round(risk_score / 3))

        print(f"[Orchestrator] DONE — verdict={result.get('verdict')} "
              f"scope={analysis_scope} iterations={memory.iteration}", flush=True)
        return result

    def _fallback_pipeline(self, memory: InvestigationMemory) -> dict:
        """Fallback: run all tools in fixed order when no LLM is available.

        This preserves the old pipeline behavior for cases where
        DEEPSEEK_API_KEY is not set.
        """
        print("[Orchestrator] Running fallback pipeline (no LLM)...", flush=True)

        # Run all tools in sequence
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
