"""
Autonomous Deep Dive Orchestrator for ARGUS.

Orchestrates the third analysis mode — LLM-driven autonomous UI
exploration running concurrently with Frida instrumentation and
network capture.

Follows the same pattern as ``DynamicOnlyOrchestrator``:
- Fixed pipeline (no planner)
- Same SSE event types for frontend compatibility
- Same response shape + backward-compatible fields

Pipeline:
    1. extract_manifest      — get package name + activities context
    2. OSINT triage          — VirusTotal + MalwareBazaar
    3. Start network capture — mitmproxy in background thread
    4. Start Frida session   — streaming FridaStreamHandle
    5. Autonomous Explorer   — LLM-driven UI exploration (main thread)
    6. Collect results       — Frida logs + network flows
    7. collect_logcat + capture_screenshot
    8. Uninstall + cleanup
    9. Verdict generation    — LLM consensus with exploration context
"""

from __future__ import annotations

import json
import threading
import time
from typing import Callable, Optional

from engine.memory import InvestigationMemory
from engine.prompts import build_consensus_system_prompt
from shared.language import parse_llm_json, enforce_language_on_findings, log_llm_prompt
from shared.scoring import compute_risk_score

# Tools reused directly (not via planner)
from tools.virustotal_tool import VirusTotalTool
from tools.malwarebazaar_tool import MalwareBazaarTool
from tools.yara_tool import YaraTool

# Explorer
from engine.autonomous_explorer import AutonomousExplorer, ExplorationConfig

# ---- Default exploration window (seconds) ----
EXPLORATION_WINDOW = 120         # 2 minutes — enough for 3-5 activity apps
FRIDA_DURATION = 120             # Frida runs for the same window
NETWORK_SLACK = 30               # capture outlives exploration by 30s


class AutonomousOrchestrator:
    """Orchestrate the Autonomous Deep Dive analysis mode.

    Installs the APK on the emulator, starts Frida hooks + mitmproxy
    capture in background threads, then drives the LLM-powered
    AutonomousExplorer in the main thread for up to *EXPLORATION_WINDOW*
    seconds.  Results from all three sources are merged into a unified
    verdict.

    Falls back to ``DynamicOnlyOrchestrator`` when no emulator or LLM
    is available (set via ``fallback_orchestrator``).
    """

    def __init__(self, llm_client, tool_registry, fallback_orchestrator=None):
        self.llm_client = llm_client
        self.tools = tool_registry
        self._fallback = fallback_orchestrator
        self._vt_tool = VirusTotalTool()
        self._mb_tool = MalwareBazaarTool()
        self._yara_tool = YaraTool(llm_client)

    def investigate(self, apk_path: str, emit: Optional[Callable[[str, dict], None]] = None) -> dict:
        """Run the autonomous deep dive investigation.

        Returns the same JSON shape as the other orchestrators.
        """
        def _emit(event: str, data: dict):
            if emit:
                try:
                    emit(event, data)
                except Exception:
                    pass

        memory = InvestigationMemory(apk_path=apk_path)

        print(f"\n{'='*60}", flush=True)
        print(f"[Autonomous] Starting autonomous deep dive: {apk_path}", flush=True)
        _emit("status", {"phase": "starting", "message": "Autonomous deep dive starting", "mode": "autonomous"})

        # ---- Guard: no LLM → fallback ----
        if not self.llm_client:
            print("[Autonomous] No LLM client — falling back to dynamic-only", flush=True)
            if self._fallback:
                return self._fallback.investigate(apk_path, emit=emit)
            return self._build_fallback_response(memory, "No LLM client configured")

        # ---- Step 0: OSINT triage ----
        _emit("tool_start", {"tool": "osint_triage", "label": "OSINT reputation check", "agent": "perm", "iteration": 0})
        vt_result = self._vt_tool.execute(apk_path=apk_path)
        mb_result = self._mb_tool.execute(apk_path=apk_path)
        memory.osint = {"virustotal": vt_result, "malwarebazaar": mb_result}
        _emit("tool_done", {"tool": "osint_triage", "label": "OSINT reputation check", "agent": "perm",
                             "summary": "OSINT triage complete", "success": True})

        # ---- Step 1: Extract manifest ----
        print("[Autonomous] Step 1: extract_manifest", flush=True)
        _emit("tool_start", {"tool": "extract_manifest", "label": "Reading APK manifest", "agent": "perm", "iteration": 1})
        manifest_result = self.tools.execute("extract_manifest", apk_path=apk_path)
        memory.add_tool_result("extract_manifest", manifest_result)
        _emit("tool_done", {"tool": "extract_manifest", "label": "Reading APK manifest", "agent": "perm",
                             "summary": manifest_result.get("summary", "Manifest extracted"),
                             "success": manifest_result.get("success", False)})

        package_name = memory.package_name
        print(f"[Autonomous] Package: {package_name}", flush=True)

        # ---- Build manifest context for the explorer ----
        manifest_context = {
            "package_name": package_name,
            "activities": memory.manifest.get("activities", []) if memory.manifest else [],
            "exported_components": memory.manifest.get("exported_components", []) if memory.manifest else [],
            "high_risk_permissions": memory.high_risk_permissions,
            "static_apis": [a.get("api", "") for a in memory.api_calls[:10]],
        }

        # ---- Guard: no emulator → fallback ----
        from sandbox import SandboxOrchestrator
        sandbox = SandboxOrchestrator()
        if not sandbox.check_emulator():
            print("[Autonomous] No emulator — falling back to dynamic-only", flush=True)
            if self._fallback:
                return self._fallback.investigate(apk_path, emit=emit)
            return self._build_fallback_response(memory, "No emulator connected")

        # ---- Step 2: Start network capture in background ----
        network_result = [None]  # mutable container
        network_duration = EXPLORATION_WINDOW + NETWORK_SLACK

        def _capture_network():
            print("[Autonomous] Network capture thread starting...", flush=True)
            network_result[0] = self.tools.execute(
                "capture_network_traffic",
                apk_path=apk_path,
                package_name=package_name,
                duration_seconds=network_duration,
            )

        network_thread = threading.Thread(target=_capture_network, daemon=True)
        network_thread.start()
        time.sleep(2)  # give mitmproxy time to bind + proxy to be set
        print(f"[Autonomous] Network capture running in background ({network_duration}s window)", flush=True)

        # ---- Step 3: Start streaming Frida session ----
        print("[Autonomous] Step 3: Starting Frida session (streaming)...", flush=True)
        _emit("tool_start", {"tool": "run_frida", "label": "Frida hooks (autonomous window)", "agent": "behavior", "iteration": 2})

        frida_result_raw = sandbox.start_frida_session(package_name, apk_path, max_seconds=FRIDA_DURATION + 30)

        if not frida_result_raw.get("success"):
            print(f"[Autonomous] Frida session failed: {frida_result_raw.get('error')}", flush=True)
            _emit("tool_done", {"tool": "run_frida", "label": "Frida hooks", "agent": "behavior",
                                 "summary": f"Frida failed: {frida_result_raw.get('error')}", "success": False})
            # Continue without Frida — we can still explore
            frida_handle = None
        else:
            frida_handle = frida_result_raw["handle"]

        # ---- Step 4: Run Autonomous Explorer (main thread) ----
        print("[Autonomous] Step 4: Starting autonomous UI explorer...", flush=True)

        ui_tool = self.tools.get("ui_automator")
        config = ExplorationConfig(
            max_steps=50,
            max_seconds=EXPLORATION_WINDOW,
        )

        explorer = AutonomousExplorer(
            llm_client=self.llm_client,
            ui_tool=ui_tool,
            package_name=package_name,
            manifest_context=manifest_context,
            frida_handle=frida_handle,
            sandbox=sandbox,
            emit=_emit,
            config=config,
        )

        exploration_result = explorer.explore()
        print(f"[Autonomous] Explorer finished: stop_reason={exploration_result.get('stop_reason')}, "
              f"steps={len(exploration_result.get('steps', []))}, "
              f"screens={exploration_result.get('screens_explored', 0)}, "
              f"frida_events={exploration_result.get('frida_events_total', 0)}", flush=True)

        # ---- Stop Frida ----
        if frida_handle:
            frida_handle.stop()

        # Build Frida result from collected logs
        from tools.frida_tool import build_frida_result
        frida_logs = frida_handle.all_logs() if frida_handle else []
        frida_result = build_frida_result(frida_logs, FRIDA_DURATION)
        memory.add_tool_result("run_frida", frida_result)

        _emit("tool_done", {"tool": "run_frida", "label": "Frida hooks (autonomous window)", "agent": "behavior",
                             "summary": frida_result.get("summary", "Frida complete"),
                             "success": frida_result.get("success", False)})

        # ---- Step 5: Collect network capture ----
        print("[Autonomous] Waiting for network capture to finish...", flush=True)
        network_thread.join(timeout=10)
        if network_result[0] is not None:
            net_result = network_result[0]
            memory.add_tool_result("capture_network_traffic", net_result)
            _emit("tool_done", {"tool": "capture_network_traffic", "label": "Network traffic capture", "agent": "network",
                                 "summary": net_result.get("summary", "Network capture complete"),
                                 "success": net_result.get("success", False)})

        # ---- Step 6: collect_logcat + screenshot ----
        for step_idx, (tool_name, label, agent, kwargs) in enumerate([
            ("collect_logcat", "System log collection", "behavior",
             {"apk_path": apk_path, "max_lines": 200}),
            ("capture_screenshot", "Runtime screenshot", "behavior",
             {"apk_path": apk_path}),
        ], start=5):
            print(f"[Autonomous] Step {step_idx}: {tool_name}", flush=True)
            _emit("tool_start", {"tool": tool_name, "label": label, "agent": agent, "iteration": step_idx})
            result = self.tools.execute(tool_name, **kwargs)
            memory.add_tool_result(tool_name, result)
            _emit("tool_done", {"tool": tool_name, "label": label, "agent": agent,
                                 "summary": result.get("summary", f"{tool_name} complete"),
                                 "success": result.get("success", False)})

        # ---- Cleanup ----
        print(f"[Autonomous] Cleanup: uninstalling {package_name}...", flush=True)
        try:
            sandbox.uninstall_apk(package_name)
        except Exception as e:
            print(f"[Autonomous] Cleanup uninstall failed (non-fatal): {e}", flush=True)

        # ---- Verdict generation ----
        _emit("consensus_start", {"message": "Generating verdict from autonomous exploration"})
        print("[Autonomous] Generating verdict...", flush=True)

        verdict_data = self._generate_verdict(memory, exploration_result)
        yara_result = self._yara_tool.execute(
            findings=memory.runtime_events,
            package_name=memory.package_name,
        )

        result = self._build_response(memory, verdict_data, yara_result, exploration_result, apk_path)
        _emit("result", result)
        return result

    # ------------------------------------------------------------------
    # Verdict generation
    # ------------------------------------------------------------------

    def _generate_verdict(self, memory: InvestigationMemory, exploration: dict) -> dict:
        """Generate verdict from autonomous deep dive evidence."""
        evidence_parts = []

        # Frida evidence
        if memory.runtime_events:
            evidence_parts.append(f"FRIDA EVENTS ({len(memory.runtime_events)} total):")
            for evt in memory.runtime_events[:15]:
                evidence_parts.append(f"  - [{evt.get('event_type', '?')}] {evt.get('evidence', '')[:100]}")

        # Network evidence
        if memory.network_analysis:
            evidence_parts.append(f"\nNETWORK ANALYSIS:")
            evidence_parts.append(f"  {memory.network_analysis.get('summary', '')}")
            for c2 in memory.network_analysis.get("c2_candidates", []):
                evidence_parts.append(f"  C2 Candidate: {c2['host']} — {c2['detail']}")

        # Exploration evidence
        if exploration:
            evidence_parts.append(f"\nAUTONOMOUS EXPLORATION:")
            evidence_parts.append(f"  Steps executed: {exploration.get('steps', 0) if isinstance(exploration.get('steps'), int) else len(exploration.get('steps', []))}")
            evidence_parts.append(f"  Activities visited: {', '.join(exploration.get('activities_visited', [])[:10])}")
            evidence_parts.append(f"  Screens explored: {exploration.get('screens_explored', 0)}")
            evidence_parts.append(f"  Stop reason: {exploration.get('stop_reason', 'unknown')}")

        # OSINT
        if memory.osint:
            vt = memory.osint.get("virustotal", {})
            if vt.get("known_malicious"):
                evidence_parts.append(f"\nOSINT: VirusTotal — {vt.get('detection_ratio', '?')} detections (KNOWN MALICIOUS)")

        evidence_summary = "\n".join(evidence_parts) or "No evidence captured."

        if not self.llm_client:
            return self._heuristic_verdict(memory)

        system_prompt = build_consensus_system_prompt("Autonomous dynamic analysis (LLM-driven UI exploration)")
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Autonomous deep dive evidence:\n\n{evidence_summary}"},
        ]

        try:
            log_llm_prompt("Consensus (Autonomous)", messages)
            response = self.llm_client.chat.completions.create(
                model="deepseek-reasoner",
                messages=messages,
                temperature=0.2,
                max_tokens=16384,
            )
            raw = (response.choices[0].message.content or "").strip()
            parsed = parse_llm_json(raw)
            if parsed and "verdict" in parsed:
                return parsed
        except Exception as e:
            print(f"[Autonomous] Verdict LLM error: {e}", flush=True)

        return self._heuristic_verdict(memory)

    def _heuristic_verdict(self, memory: InvestigationMemory) -> dict:
        """Fallback heuristic verdict when LLM is unavailable."""
        score = 25
        findings = []

        evt_count = len(memory.runtime_events)
        if evt_count > 10:
            score += 20
            findings.append(f"{evt_count} runtime hook events triggered")

        c2_count = len(memory.network_analysis.get("c2_candidates", []))
        if c2_count:
            score += 30
            findings.append(f"{c2_count} potential C2 beaconing hosts")

        raw_ips = memory.network_analysis.get("unique_ips", [])
        if raw_ips:
            score += 20
            findings.append(f"Raw IP connections (DNS bypass): {', '.join(raw_ips[:3])}")

        if score >= 70:
            verdict = "high-risk"
        elif score >= 40:
            verdict = "suspicious"
        else:
            verdict = "benign"

        return {
            "verdict": verdict,
            "confidence": min(score, 90),
            "executive_summary": f"Autonomous deep dive complete. {'; '.join(findings) or 'No anomalous behaviour detected.'}",
            "key_findings": findings,
            "recommended_actions": "Review exploration journal and captured evidence for full picture.",
            "mitre_techniques": [],
        }

    # ------------------------------------------------------------------
    # Response building
    # ------------------------------------------------------------------

    def _build_response(
        self,
        memory: InvestigationMemory,
        verdict_data: dict,
        yara_result: dict,
        exploration: dict,
        apk_path: str,
    ) -> dict:
        """Build the final response JSON — backward compatible + exploration fields."""
        from shared.evidence import build_correlation_matrix

        verdict = verdict_data.get("verdict", "suspicious")
        confidence = verdict_data.get("confidence", 50)

        correlations = build_correlation_matrix(
            memory.api_calls, memory.raw_dynamic_logs, memory.sandbox_status
        )

        frida_tool_output = memory.tool_outputs.get("run_frida", {})

        agent_findings = {
            "behavior": {
                "summary": (
                    f"Autonomous exploration: {exploration.get('screens_explored', 0)} screens, "
                    f"{exploration.get('activities_visited', [])} visited. "
                    f"{len(memory.runtime_events)} runtime events captured."
                ),
                "findings": [],
                "hooks_triggered": frida_tool_output.get("hooks_triggered", 0),
                "hooks_silent": frida_tool_output.get("hooks_silent", 0),
            },
            "network": {
                "summary": memory.network_analysis.get("summary", "No network data"),
                "findings": [
                    {"evidence": c["detail"], "interpretation": c["verdict"],
                     "confidence": "HIGH", "runtime_validation": "OBSERVED"}
                    for c in memory.network_analysis.get("c2_candidates", [])
                ],
            },
        }

        return {
            "verdict": verdict,
            "confidence": confidence,
            "executive_summary": verdict_data.get("executive_summary", ""),
            "analyst_summary": verdict_data.get("executive_summary", ""),
            "recommended_actions": verdict_data.get("recommended_actions", ""),
            "mitre_techniques": verdict_data.get("mitre_techniques", []),
            "package": memory.package_name,
            "permission_score_percent": compute_risk_score(
                memory.permissions, memory.high_risk_permissions,
                memory.api_calls, memory.manifest_vulnerabilities,
                memory.hardcoded_secrets, memory.raw_dynamic_logs,
            ),
            "high_risk_permissions": memory.high_risk_permissions,
            "api_calls": memory.api_calls,
            "pipeline_status": {
                "apktool": {"success": False, "message": "Not run (autonomous mode)"},
                "jadx": {"success": False, "message": "Not run (autonomous mode)"},
                "sandbox": {"success": True, "message": f"Autonomous exploration — {exploration.get('stop_reason', 'complete')}"},
            },
            "correlations": correlations,
            "agent_findings": agent_findings,
            "analysis_scope": "autonomous_dynamic",
            "osint": memory.osint,
            "yara_rule": yara_result.get("yara_rule"),
            "yara_rule_name": yara_result.get("rule_name"),
            "exploration": {
                "total_steps": len(exploration.get("steps", [])),
                "activities_visited": exploration.get("activities_visited", []),
                "screens_explored": exploration.get("screens_explored", 0),
                "elements_touched": exploration.get("elements_touched", 0),
                "stop_reason": exploration.get("stop_reason", "unknown"),
                "frida_events_total": exploration.get("frida_events_total", 0),
            },
            "network_flows": memory.network_analysis.get("classified_flows", [])[:20],
            "c2_candidates": memory.network_analysis.get("c2_candidates", []),
            "dynamic_key_findings": verdict_data.get("key_findings", []),
        }

    @staticmethod
    def _build_fallback_response(memory: InvestigationMemory, reason: str) -> dict:
        """Minimal response when the mode can't run."""
        return {
            "verdict": "benign",
            "confidence": 0,
            "executive_summary": f"Autonomous deep dive could not run: {reason}",
            "analysis_scope": "autonomous_dynamic",
            "package": memory.package_name,
            "high_risk_permissions": memory.high_risk_permissions,
            "api_calls": memory.api_calls,
            "pipeline_status": {"sandbox": {"success": False, "message": reason}},
            "agent_findings": {},
            "exploration": {"total_steps": 0, "stop_reason": reason},
        }
