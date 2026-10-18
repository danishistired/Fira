"""
Planner for ARGUS agentic investigation engine.

The planner is the decision-maker. It receives the current investigation
state from memory and returns a single JSON action telling the orchestrator
which tool to execute next.

This is where DeepSeek acts as an investigator, not a report writer.
Each call to decide() is one "thought step" in the investigation.
"""

import json
from engine.memory import InvestigationMemory
from engine.prompts import build_planner_system_prompt
from shared.language import parse_llm_json, log_llm_prompt


class Planner:
    """DeepSeek-powered investigation planner.

    Each call to decide() sends the investigation state to DeepSeek
    and receives back a single tool action. This is the agentic core
    that replaces the fixed pipeline.
    """

    def __init__(self, llm_client):
        self.llm_client = llm_client

    def decide(self, memory: InvestigationMemory, tool_registry) -> dict:
        """Ask DeepSeek to decide the next investigation step.

        Args:
            memory: Current investigation state
            tool_registry: ToolRegistry instance (for tool descriptors)

        Returns:
            dict with keys: action, arguments, reason
            Example: {"action": "run_jadx", "arguments": {"apk_path": "..."}, "reason": "..."}
        """
        # Build the system prompt with tool descriptors
        tool_descriptors = tool_registry.list_tools()
        system_prompt = build_planner_system_prompt(tool_descriptors)

        # Build the user message with investigation state
        investigation_state = memory.get_planner_summary()
        available_tools = tool_registry.list_tool_names()

        user_message = f"""## Current Investigation State

{investigation_state}

## Available Tools
{json.dumps(available_tools)}

## Constraints
- apk_path: {memory.apk_path}
- package_name: {memory.package_name}
- iteration: {memory.iteration} of 15
- Tools already run: {', '.join(memory.tool_outputs.keys()) if memory.tool_outputs else 'none'}

Decide the next investigation step. Respond with ONLY a JSON object."""

        max_attempts = 2
        for attempt in range(1, max_attempts + 1):
            try:
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ]

                if attempt == 1:
                    log_llm_prompt(f"Planner (iteration {memory.iteration})", messages)

                print(f"[Planner] Iteration {memory.iteration} — requesting decision "
                      f"(attempt {attempt}/{max_attempts})...", flush=True)

                response = self.llm_client.chat.completions.create(
                    model="deepseek-v4-flash",
                    messages=messages,
                    temperature=0.1 + (attempt - 1) * 0.1,  # slightly higher on retry
                    max_tokens=500,  # decisions are short
                )

                raw = response.choices[0].message.content.strip()
                print(f"[Planner] Received decision ({len(raw)} chars)", flush=True)

                decision = parse_llm_json(raw)

                # Validate the decision structure
                decision = self._validate_decision(decision, memory, available_tools)

                print(f"[Planner] Decision: {decision['action']} — {decision.get('reason', 'N/A')}",
                      flush=True)
                return decision

            except json.JSONDecodeError as e:
                print(f"[Planner] JSON parse error (attempt {attempt}): {e}", flush=True)
                if attempt == max_attempts:
                    # Fallback: generate report if we can't parse the decision
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

    def _validate_decision(self, decision: dict, memory: InvestigationMemory,
                           available_tools: list[str]) -> dict:
        """Validate and fix a planner decision.

        Ensures:
        - 'action' is a valid tool name
        - 'arguments' is a dict
        - 'reason' is present
        - apk_path and package_name are injected if needed
        """
        # Ensure required fields
        if "action" not in decision:
            raise ValueError("Decision missing 'action' field")

        action = decision["action"]

        # Validate tool name
        if action not in available_tools:
            # Try common corrections
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

        # Inject apk_path and package_name if the tool needs them
        # (the planner doesn't need to remember these — we inject them)
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
