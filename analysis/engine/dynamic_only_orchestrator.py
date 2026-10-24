"""
Dynamic-Only Investigation Orchestrator for ARGUS.

A simplified, fixed-pipeline orchestrator that runs ONLY the dynamic
analysis tools (Frida, network capture, Monkey, logcat, screenshot)
without the full agentic planner loop.

Use this when the analyst wants fast runtime-only results and already
has (or doesn't need) static analysis findings.

Pipeline (in order):
    1. extract_manifest  — get package name (required for Frida/Monkey)
    2. run_mobsf         — MobSF quick analysis (skips if not configured)
    3. run_frida + capture_network — Frida hooks AND mitmproxy capture
       run CONCURRENTLY for the same duration window so network traffic
       from the instrumented app is captured.
    4. run_monkey        — UI exploration (trigger hidden behaviors)
    5. collect_logcat    — system logs
    6. capture_screenshot— visual evidence
    7. Cleanup            — uninstall APK
    8. Adversarial consensus — verdict from dynamic-only evidence

Emits the same SSE event types as the full InvestigationOrchestrator
so the frontend requires no changes.
"""

import json
import threading
import time
from typing import Callable, Optional

from engine.memory import InvestigationMemory
from engine.prompts import build_consensus_system_prompt
from shared.language import parse_llm_json, enforce_language_on_findings, log_llm_prompt
from shared.scoring import compute_risk_score
from tools.virustotal_tool import VirusTotalTool
from tools.malwarebazaar_tool import MalwareBazaarTool
from tools.yara_tool import YaraTool

# Dynamic-only tool pipeline (fixed order, no planner).
# capture_network_traffic is handled concurrently with run_frida — not listed here.
DYNAMIC_PIPELINE = [
    {
        "tool": "run_mobsf",
        "label": "MobSF independent analysis",
        "agent": "code",
        "args": {},          # apk_path injected at runtime
        "optional": True,    # Skip gracefully if MobSF not configured
    },
    {
        "tool": "run_frida",
        "label": "Frida dynamic hooks",
        "agent": "behavior",
        "args": {"duration_seconds": 20, "cleanup": False},  # cleanup deferred to end
    },
    {
        "tool": "run_monkey",
        "label": "UI code path exploration",
        "agent": "behavior",
        "args": {"event_count": 300},
    },
    {
        "tool": "collect_logcat",
        "label": "System log collection",
        "agent": "behavior",
        "args": {"max_lines": 200},
    },
    {
        "tool": "capture_screenshot",
        "label": "Runtime screenshot",
        "agent": "behavior",
        "args": {},
    },
]


class DynamicOnlyOrchestrator:
    """Fixed-pipeline dynamic-analysis-only investigation.

    Bypasses the agentic planner. Runs a predetermined sequence of
    dynamic tools and generates a verdict from runtime-only evidence.
    """

    def __init__(self, llm_client, tool_registry):
        self.llm_client = llm_client
        self.tools = tool_registry
        self._vt_tool = VirusTotalTool()
        self._mb_tool = MalwareBazaarTool()
        self._yara_tool = YaraTool(llm_client)

    def investigate(self, apk_path: str, emit: Optional[Callable[[str, dict], None]] = None) -> dict:
        """Run the dynamic-only investigation pipeline.

        Returns the same JSON shape as InvestigationOrchestrator.
        """
        def _emit(event: str, data: dict):
            if emit:
                try:
                    emit(event, data)
                except Exception:
                    pass

        memory = InvestigationMemory(apk_path=apk_path)

        print(f"\n{'='*60}", flush=True)
        print(f"[DynamicOnly] Starting dynamic-only investigation: {apk_path}", flush=True)
        _emit("status", {"phase": "starting", "message": "Dynamic analysis starting", "mode": "dynamic_only"})

        # ---- Step 0: OSINT triage ----
        _emit("tool_start", {"tool": "osint_triage", "label": "OSINT reputation check", "agent": "perm", "iteration": 0})
        vt_result = self._vt_tool.execute(apk_path=apk_path)
        mb_result = self._mb_tool.execute(apk_path=apk_path)
        memory.osint = {"virustotal": vt_result, "malwarebazaar": mb_result}
        _emit("tool_done", {"tool": "osint_triage", "label": "OSINT reputation check", "agent": "perm",
                             "summary": "OSINT triage complete", "success": True})

        # ---- Step 1: Always extract manifest (need package_name for dynamic tools) ----
        print("[DynamicOnly] Step 1: extract_manifest", flush=True)
        _emit("tool_start", {"tool": "extract_manifest", "label": "Reading APK manifest", "agent": "perm", "iteration": 1})
        manifest_result = self.tools.execute("extract_manifest", apk_path=apk_path)
        memory.add_tool_result("extract_manifest", manifest_result)
        _emit("tool_done", {"tool": "extract_manifest", "label": "Reading APK manifest", "agent": "perm",
                             "summary": manifest_result.get("summary", "Manifest extracted"),
                             "success": manifest_result.get("success", False)})

        package_name = memory.package_name
        print(f"[DynamicOnly] Package: {package_name}", flush=True)

        # ---- Step 2+: Dynamic tool pipeline ----
        # Network capture is started in a background thread BEFORE Frida so
        # the capture window overlaps with the instrumented app's execution.
        network_thread = None
        network_result = [None]  # mutable container — thread writes result here
        network_duration = 20  # seconds, matches Frida duration

        for step_idx, step in enumerate(DYNAMIC_PIPELINE, start=2):
            tool_name = step["tool"]
            label = step["label"]
            agent = step["agent"]
            optional = step.get("optional", False)

            # Build arguments
            args = dict(step["args"])
            args["apk_path"] = apk_path
            if "run_frida" in tool_name or "run_monkey" in tool_name or "capture_network" in tool_name:
                args["package_name"] = package_name

            # ---- Special handling: start network capture BEFORE Frida ----
            if tool_name == "run_frida":
                # Fire-and-forget: start mitmproxy capture in background thread
                def _capture_network():
                    print("[DynamicOnly] Network capture thread starting...", flush=True)
                    network_result[0] = self.tools.execute(
                        "capture_network_traffic",
                        apk_path=apk_path,
                        package_name=package_name,
                        duration_seconds=network_duration,
                    )

                network_thread = threading.Thread(target=_capture_network, daemon=True)
                network_thread.start()
                # Give mitmproxy time to bind the port and the emulator proxy to be set
                time.sleep(2)
                print("[DynamicOnly] Network capture running in background (alongside Frida)", flush=True)

            print(f"[DynamicOnly] Step {step_idx}: {tool_name}", flush=True)
            _emit("tool_start", {"tool": tool_name, "label": label, "agent": agent, "iteration": step_idx})

            try:
                result = self.tools.execute(tool_name, **args)
            except Exception as e:
                result = {"success": False, "error": str(e), "skipped": optional}

            if not result.get("success") and optional:
                print(f"[DynamicOnly] {tool_name} skipped: {result.get('error', 'not configured')}", flush=True)
                _emit("tool_done", {"tool": tool_name, "label": label, "agent": agent,
                                     "summary": f"Skipped: {result.get('error', 'not configured')}",
                                     "success": False, "skipped": True})
                continue

            memory.add_tool_result(tool_name, result)
            _emit("tool_done", {"tool": tool_name, "label": label, "agent": agent,
                                 "summary": result.get("summary", f"{tool_name} complete"),
                                 "success": result.get("success", False)})

            # ---- After Frida: collect network capture results ----
            if tool_name == "run_frida" and network_thread is not None:
                print("[DynamicOnly] Waiting for network capture to finish...", flush=True)
                network_thread.join(timeout=10)
                if network_result[0] is not None:
                    net_result = network_result[0]
                    memory.add_tool_result("capture_network_traffic", net_result)
                    _emit("tool_done", {
                        "tool": "capture_network_traffic",
                        "label": "Network traffic capture",
                        "agent": "network",
                        "summary": net_result.get("summary", "Network capture complete"),
                        "success": net_result.get("success", False),
                    })
                    print(f"[DynamicOnly] Network capture complete: {net_result.get('summary', '')}", flush=True)
                else:
                    print("[DynamicOnly] Network capture returned no result (may have failed to start)", flush=True)

        # ---- Final cleanup: uninstall the APK ----
        print(f"[DynamicOnly] Cleanup: uninstalling {package_name}...", flush=True)
        try:
            from sandbox import SandboxOrchestrator
            sb = SandboxOrchestrator()
            sb.uninstall_apk(package_name)
        except Exception as _cleanup_err:
            print(f"[DynamicOnly] Cleanup uninstall failed (non-fatal): {_cleanup_err}", flush=True)

        # ---- Verdict generation ----
        _emit("consensus_start", {"message": "Generating verdict from dynamic evidence"})
        print("[DynamicOnly] Generating verdict...", flush=True)

        verdict_data = self._generate_verdict(memory)
        yara_result = self._yara_tool.execute(
            findings=memory.runtime_events,
            package_name=memory.package_name,
        )

        result = self._build_response(memory, verdict_data, yara_result, apk_path)
        _emit("result", result)
        return result

    def _generate_verdict(self, memory: InvestigationMemory) -> dict:
        """Generate a verdict from dynamic-only evidence using the model router."""
        # Build evidence summary for LLM
        evidence_parts = []

        if memory.runtime_events:
            evidence_parts.append(f"FRIDA EVENTS ({len(memory.runtime_events)} total):")
            for evt in memory.runtime_events[:15]:
                evidence_parts.append(f"  - [{evt.get('event_type','?')}] {evt.get('evidence','')[:100]}")

        if memory.network_analysis:
            evidence_parts.append(f"\nNETWORK ANALYSIS:")
            evidence_parts.append(f"  {memory.network_analysis.get('summary', '')}")
            for c2 in memory.network_analysis.get("c2_candidates", []):
                evidence_parts.append(f"  C2 Candidate: {c2['host']} — {c2['detail']}")
            for ip in memory.network_analysis.get("unique_ips", []):
                evidence_parts.append(f"  Raw IP connection: {ip}")

        if memory.mobsf_findings:
            score = memory.mobsf_findings.get("score")
            evidence_parts.append(f"\nMOBSF ANALYSIS (score: {score}/100):")
            for issue in memory.mobsf_findings.get("api_abuse", [])[:5]:
                evidence_parts.append(f"  - [{issue.get('severity','?').upper()}] {issue.get('title','')}")

        if memory.osint:
            vt = memory.osint.get("virustotal", {})
            if vt.get("known_malicious"):
                evidence_parts.append(f"\nOSINT: VirusTotal — {vt.get('detection_ratio', '?')} detections")

        evidence_summary = "\n".join(evidence_parts) or "No dynamic evidence captured (emulator may not be connected)."

        system_prompt = (
            "You are a senior Android malware analyst reviewing dynamic analysis results. "
            "Based ONLY on the runtime evidence provided, produce a JSON verdict. "
            "Do NOT speculate beyond the evidence. Use precise, factual language only.\n\n"
            "Required JSON format:\n"
            '{"verdict": "benign|suspicious|high-risk|malicious", '
            '"confidence": <0-100>, '
            '"executive_summary": "...", '
            '"key_findings": ["finding1", "finding2"], '
            '"recommended_actions": "...", '
            '"mitre_techniques": ["T1xxx - Name"]}'
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Dynamic analysis evidence:\n\n{evidence_summary}"},
        ]

        try:
            log_llm_prompt("Consensus (Dynamic Only)", messages)
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
            print(f"[DynamicOnly] Verdict LLM error: {e}", flush=True)

        # Fallback: heuristic verdict from evidence
        return self._heuristic_verdict(memory)

    def _heuristic_verdict(self, memory: InvestigationMemory) -> dict:
        """Fallback verdict when LLM is unavailable."""
        score = 20
        findings = []

        evt_count = len(memory.runtime_events)
        if evt_count > 10:
            score += 20
            findings.append(f"{evt_count} runtime hook events triggered")

        c2_count = len(memory.network_analysis.get("c2_candidates", []))
        if c2_count:
            score += 30
            findings.append(f"{c2_count} potential C2 beaconing hosts identified")

        raw_ips = memory.network_analysis.get("unique_ips", [])
        if raw_ips:
            score += 20
            findings.append(f"Raw IP connections (DNS bypass): {', '.join(raw_ips[:3])}")

        mobsf_score = memory.mobsf_findings.get("score")
        if mobsf_score is not None and mobsf_score < 40:
            score += 20
            findings.append(f"MobSF security score: {mobsf_score}/100")

        if score >= 70:
            verdict = "high-risk"
        elif score >= 40:
            verdict = "suspicious"
        else:
            verdict = "benign"

        return {
            "verdict": verdict,
            "confidence": min(score, 90),
            "executive_summary": f"Dynamic-only analysis complete. {'; '.join(findings) or 'No anomalous behavior detected at runtime.'}",
            "key_findings": findings,
            "recommended_actions": "Review dynamic evidence and run full analysis for complete picture.",
            "mitre_techniques": [],
        }

    def _build_response(self, memory: InvestigationMemory, verdict_data: dict, yara_result: dict, apk_path: str) -> dict:
        """Build the final response JSON compatible with the full orchestrator's shape."""
        from shared.evidence import build_correlation_matrix

        verdict = verdict_data.get("verdict", "suspicious")
        confidence = verdict_data.get("confidence", 50)

        # Build correlation matrix
        correlations = build_correlation_matrix(
            api_calls=memory.api_calls,
            dynamic_logs=memory.raw_dynamic_logs,
            sandbox_status=memory.sandbox_status
        )

        agent_findings = {
            "behavior": {
                "summary": f"{len(memory.runtime_events)} runtime events captured",
                "findings": [],
                "hooks_triggered": memory.tool_outputs.get("run_frida", {}).get("hooks_triggered", 0),
                "hooks_silent": memory.tool_outputs.get("run_frida", {}).get("hooks_silent", 0),
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
            # Standard fields (same as full pipeline)
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
                memory.hardcoded_secrets, memory.raw_dynamic_logs
            ),
            "high_risk_permissions": memory.high_risk_permissions,
            "api_calls": memory.api_calls,
            "pipeline_status": {
                "apktool": {"success": False, "message": "Not run (dynamic-only mode)"},
                "jadx": {"success": False, "message": "Not run (dynamic-only mode)"},
                "sandbox": memory.sandbox_status,
            },
            "correlations": correlations,
            "agent_findings": agent_findings,
            "analysis_scope": "dynamic_only",
            "osint": memory.osint,
            "yara_rule": yara_result.get("yara_rule"),
            "yara_rule_name": yara_result.get("rule_name"),
            # Phase 2 specific
            "network_flows": memory.network_analysis.get("classified_flows", [])[:20],
            "c2_candidates": memory.network_analysis.get("c2_candidates", []),
            "mobsf_findings": memory.mobsf_findings,
            "dynamic_key_findings": verdict_data.get("key_findings", []),
        }
