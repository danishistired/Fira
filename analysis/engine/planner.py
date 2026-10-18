"""
Planner for ARGUS agentic investigation engine.

The planner is an autonomous investigator. Each call to decide()
sends the investigation state to DeepSeek and receives back structured
reasoning: reflection, hypotheses, knowledge gaps, confidence, and
the next tool action.

This is the agentic core — it doesn't just pick a tool, it THINKS.
Every response includes:
- reflection on what was learned
- updated hypotheses with confidence scores
- knowledge gaps driving the next decision
- confidence evolution with reasoning
- the next tool to execute with justification
"""

import json
from engine.memory import InvestigationMemory
from engine.prompts import build_planner_system_prompt
from shared.language import parse_llm_json, log_llm_prompt

# RAG retriever — lazy import to avoid startup cost
try:
    from rag.retriever import retrieve_techniques, format_rag_context
    _RAG_AVAILABLE = True
except ImportError:
    _RAG_AVAILABLE = False


def _build_rag_query(memory: InvestigationMemory) -> str:
    """Build a query string from current investigation evidence for RAG retrieval."""
    parts = []
    # High-signal API calls
    for a in memory.api_calls:
        if a.get("signal") in ("HIGH", "MEDIUM"):
            parts.append(a.get("api", ""))
    # High-risk permissions
    for p in memory.high_risk_permissions[:5]:
        parts.append(p.split(".")[-1])  # short name
    # Hardcoded secrets types
    for s in memory.hardcoded_secrets[:3]:
        parts.append(s.get("type", ""))
    # Runtime events
    for e in memory.runtime_events[:5]:
        parts.append(e.get("event_type", ""))
    # OSINT family tags
    vt = memory.osint.get("virustotal", {})
    parts.extend(vt.get("family_tags", []))
    mb = memory.osint.get("malwarebazaar", {})
    if mb.get("malware_family"):
        parts.append(mb["malware_family"])
    return " ".join(p for p in parts if p).strip()


class Planner:
    """DeepSeek-powered autonomous investigation planner.

    Each call to decide() sends the investigation state to DeepSeek
    and receives structured reasoning. The reasoning is stored in
    memory before the action is returned to the orchestrator.
    """

    def __init__(self, llm_client):
        self.llm_client = llm_client

    def decide(self, memory: InvestigationMemory, tool_registry) -> dict:
        """Ask DeepSeek to reflect, reason, and decide the next step.

        Returns a dict with at minimum: action, arguments, reason.
        Also stores reflection, hypotheses, knowledge_gaps, confidence,
        and journal entry in memory.
        """
        # Build the system prompt with tool descriptors + metadata + RAG context
        tool_descriptors = tool_registry.list_tools()

        # Retrieve ATT&CK context from RAG
        rag_context = ""
        if _RAG_AVAILABLE:
            try:
                rag_query = _build_rag_query(memory)
                if rag_query:
                    techniques = retrieve_techniques(rag_query, n=5)
                    rag_context = format_rag_context(techniques)
                    if rag_context:
                        print(f"[Planner] RAG: {len(techniques)} ATT&CK techniques retrieved", flush=True)
            except Exception as e:
                print(f"[Planner] RAG retrieval skipped: {e}", flush=True)

        system_prompt = build_planner_system_prompt(tool_descriptors, rag_context=rag_context)

        # Build the user message with investigation state + budget
        investigation_state = memory.get_planner_summary()
        available_tools = tool_registry.list_tool_names()
        budget = memory.get_budget_status()

        user_message = f"""## Current Investigation State

{investigation_state}

## Budget Status
- Budget spent: {budget['budget_spent']}/{budget['budget_total']} units
- Budget remaining: {budget['budget_remaining']} units
- Tool calls made: {budget['tool_calls']}
- Coverage: {budget['coverage_percent']}%
{"- WARNING: Budget is running low. Consider concluding soon." if budget['budget_remaining'] <= 8 else ""}
{"- CRITICAL: Budget nearly exhausted. Conclude unless critical evidence is missing." if budget['budget_remaining'] <= 3 else ""}

## Available Tools
{json.dumps(available_tools)}

## Constraints
- apk_path: {memory.apk_path}
- package_name: {memory.package_name}
- Tools already run: {', '.join(memory.tool_outputs.keys()) if memory.tool_outputs else 'none'}

Reflect on the evidence, update your hypotheses, identify knowledge gaps, and decide the next investigation step. Respond with ONLY a JSON object."""

        max_attempts = 2
        for attempt in range(1, max_attempts + 1):
            try:
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ]

                if attempt == 1:
                    log_llm_prompt(f"Planner (iteration {memory.iteration})", messages)

                print(f"[Planner] Iteration {memory.iteration} — requesting structured reasoning "
                      f"(attempt {attempt}/{max_attempts})...", flush=True)

                response = self.llm_client.chat.completions.create(
                    model="deepseek-reasoner",  # Pro: iterative hypothesis updates + multi-tool decision reasoning
                    messages=messages,
                    temperature=0.1 + (attempt - 1) * 0.1,
                    max_tokens=8000,  # reasoner emits chain-of-thought before the JSON answer
                )

                raw = response.choices[0].message.content.strip()
                print(f"[Planner] Received reasoning ({len(raw)} chars)", flush=True)

                decision = parse_llm_json(raw)

                # Store all reasoning in memory BEFORE returning the action
                self._store_reasoning(decision, memory)

                # Validate and normalize the action for the orchestrator
                decision = self._validate_decision(decision, memory, available_tools)

                print(f"[Planner] Decision: {decision['action']} — {decision.get('reason', 'N/A')}",
                      flush=True)
                if decision.get('confidence') is not None:
                    print(f"[Planner] Confidence: {decision['confidence']}% — "
                          f"{decision.get('confidence_reasoning', 'N/A')}", flush=True)
                return decision

            except json.JSONDecodeError as e:
                print(f"[Planner] JSON parse error (attempt {attempt}): {e}", flush=True)
                if attempt == max_attempts:
                    print("[Planner] Falling back to generate_report after parse failures", flush=True)
                    return {
                        "action": "generate_report",
                        "arguments": {"reasoning": "Planner JSON parse failure — generating report with available evidence."},
                        "reason": "Planner communication error. Generating report with available evidence.",
                    }

            except Exception as e:
                print(f"[Planner] Error (attempt {attempt}): {type(e).__name__}: {e}", flush=True)
                if attempt == max_attempts:
                    return {
                        "action": "generate_report",
                        "arguments": {"reasoning": f"Planner error: {e}. Generating report with available evidence."},
                        "reason": f"Planner error: {e}",
                    }

    def _store_reasoning(self, decision: dict, memory: InvestigationMemory):
        """Extract and store all reasoning fields from the planner's response.

        This is what makes the planner truly agentic — it doesn't just
        pick a tool, it reasons. We capture that reasoning for:
        - The investigation journal (visible to the user)
        - Hypothesis tracking (evolving across iterations)
        - Knowledge gaps (driving next tool selection)
        - Confidence history (showing how confidence evolved)
        """
        # 1. Store hypotheses
        hypotheses = decision.get("hypotheses", [])
        if hypotheses:
            memory.update_hypotheses(hypotheses)

        # 2. Store knowledge gaps
        gaps = decision.get("knowledge_gaps", [])
        memory.update_knowledge_gaps(gaps)

        # 3. Record confidence
        confidence = decision.get("confidence")
        confidence_reasoning = decision.get("confidence_reasoning", "")
        if confidence is not None:
            memory.record_confidence(int(confidence), confidence_reasoning)

        # 4. Add journal entry
        journal_entry = {
            "thought": decision.get("reflection", ""),
            "current_understanding": decision.get("current_understanding", ""),
            "action": decision.get("next_action", decision.get("action", "")),
            "reason": decision.get("reason", ""),
            "hypotheses_snapshot": [
                {"hypothesis": h.get("hypothesis", ""), "confidence": h.get("confidence", 0), "status": h.get("status", "")}
                for h in hypotheses[:5]
            ],
            "knowledge_gaps_snapshot": gaps[:5],
            "confidence": confidence,
        }
        memory.add_journal_entry(journal_entry)

        print(f"[Planner] Stored reasoning: {len(hypotheses)} hypotheses, "
              f"{len(gaps)} gaps, confidence={confidence}%", flush=True)

    def _validate_decision(self, decision: dict, memory: InvestigationMemory,
                           available_tools: list[str]) -> dict:
        """Validate and normalize a planner decision.

        Maps the structured output (next_action) to the orchestrator's
        expected format (action). Injects apk_path and package_name.
        """
        # Map next_action -> action (backward compat with orchestrator)
        if "next_action" in decision and "action" not in decision:
            decision["action"] = decision["next_action"]

        # Ensure required fields
        if "action" not in decision:
            raise ValueError("Decision missing 'action' and 'next_action' fields")

        action = decision["action"]

        # Validate tool name
        if action not in available_tools:
            corrections = {
                "extract_permissions": "scan_permissions",
                "decompile": "run_jadx",
                "frida": "run_frida",
                "monkey": "run_monkey",
                "logcat": "collect_logcat",
                "screenshot": "capture_screenshot",
                "report": "generate_report",
                "done": "generate_report",
                "finish": "generate_report",
                "complete": "generate_report",
            }
            if action in corrections:
                decision["action"] = corrections[action]
                print(f"[Planner] Corrected tool name: {action} -> {decision['action']}", flush=True)
            else:
                raise ValueError(f"Unknown tool: {action}. Available: {available_tools}")

        # Ensure arguments dict exists
        if "arguments" not in decision:
            decision["arguments"] = {}
        if not isinstance(decision["arguments"], dict):
            decision["arguments"] = {}

        # Inject apk_path and package_name
        args = decision["arguments"]
        action = decision["action"]

        if action in ("extract_manifest", "run_apktool", "run_jadx", "run_frida", "scan_permissions"):
            if "apk_path" not in args:
                args["apk_path"] = memory.apk_path

        if action in ("run_frida", "run_monkey", "collect_logcat"):
            if "package_name" not in args and memory.package_name != "unknown":
                args["package_name"] = memory.package_name

        # Ensure reason
        if "reason" not in decision:
            decision["reason"] = "No reason provided"

        return decision
