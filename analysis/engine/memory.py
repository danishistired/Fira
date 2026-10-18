"""
Investigation memory for ARGUS agentic engine.

Accumulates evidence across investigation iterations. The planner
receives a summary of this state at every step — never raw data.

Design principles:
- Evidence is stored structured, never as raw text
- get_planner_summary() returns a condensed view optimized for LLM reasoning
- Coverage tracking tells the planner what has/hasn't been analyzed
- Decision history provides context for what was already tried
"""

import json
from typing import Optional


class InvestigationMemory:
    """Accumulates evidence across investigation iterations.

    The planner receives get_planner_summary() at every step.
    The orchestrator reads the accumulated state to build the final report.
    """

    def __init__(self, apk_path: str):
        self.apk_path = apk_path

        # Core identity (set after manifest extraction)
        self.package_name: str = "unknown"

        # Evidence buckets — populated by tools
        self.manifest: Optional[dict] = None
        self.permissions: list[str] = []
        self.high_risk_permissions: list[str] = []
        self.manifest_vulnerabilities: list[dict] = []
        self.api_calls: list[dict] = []
        self.code_snippets: list[dict] = []
        self.hardcoded_secrets: list[dict] = []
        self.runtime_events: list[dict] = []
        self.raw_dynamic_logs: list = []
        self.manifest_xml: str = ""
        self.correlation_matrix: list[dict] = []

        # Investigation tracking
        self.decisions: list[dict] = []         # {iteration, action, reason, result_summary}
        self.tool_outputs: dict[str, dict] = {} # Raw tool outputs keyed by tool name
        self.iteration: int = 0
        self.status: str = "investigating"      # "investigating" | "complete"

        # Coverage tracking — what analysis areas have been covered
        self.coverage: dict[str, bool] = {
            "manifest": False,
            "permissions_deep": False,
            "source_code": False,
            "apktool_resources": False,
            "runtime_frida": False,
            "runtime_monkey": False,
            "logcat": False,
            "screenshot": False,
        }

        # Sandbox status (for backward compatibility)
        self.sandbox_status: dict = {"success": False, "message": "Not run"}

    def add_tool_result(self, tool_name: str, result: dict):
        """Record a tool's output and update evidence buckets.

        This is the main entry point for recording evidence. It dispatches
        to specific handlers based on tool name, extracting structured
        evidence into the appropriate buckets.
        """
        self.tool_outputs[tool_name] = result

        if not result.get("success", False):
            print(f"[Memory] Tool {tool_name} failed: {result.get('error', 'unknown')}", flush=True)
            return

        # Dispatch to evidence extractors
        if tool_name == "extract_manifest":
            self._ingest_manifest(result)
        elif tool_name == "scan_permissions":
            self._ingest_permissions(result)
        elif tool_name == "run_apktool":
            self._ingest_apktool(result)
        elif tool_name == "run_jadx":
            self._ingest_jadx(result)
        elif tool_name == "run_frida":
            self._ingest_frida(result)
        elif tool_name == "run_monkey":
            self.coverage["runtime_monkey"] = True
        elif tool_name == "collect_logcat":
            self.coverage["logcat"] = True
        elif tool_name == "capture_screenshot":
            self.coverage["screenshot"] = True

        print(f"[Memory] Ingested {tool_name} result. Coverage: "
              f"{sum(self.coverage.values())}/{len(self.coverage)}", flush=True)

    def _ingest_manifest(self, result: dict):
        """Extract manifest evidence into memory buckets."""
        self.manifest = result
        self.package_name = result.get("package_name", "unknown")
        self.permissions = result.get("permissions", [])
        self.high_risk_permissions = result.get("high_risk_permissions", [])
        self.coverage["manifest"] = True

    def _ingest_permissions(self, result: dict):
        """Extract deep permission/vulnerability analysis."""
        self.manifest_vulnerabilities = result.get("manifest_vulnerabilities", [])
        self.coverage["permissions_deep"] = True

    def _ingest_apktool(self, result: dict):
        """Extract APKTool results (raw manifest XML)."""
        self.manifest_xml = result.get("manifest_xml", "")
        self.coverage["apktool_resources"] = True

    def _ingest_jadx(self, result: dict):
        """Extract JADX source code analysis results."""
        self.api_calls = result.get("suspicious_apis", [])
        self.hardcoded_secrets = result.get("hardcoded_secrets", [])
        self.code_snippets = result.get("code_snippets", [])
        self.coverage["source_code"] = True

    def _ingest_frida(self, result: dict):
        """Extract Frida dynamic analysis results."""
        self.runtime_events = result.get("runtime_events", [])
        self.raw_dynamic_logs = result.get("raw_logs", [])
        self.coverage["runtime_frida"] = True
        if result.get("success"):
            self.sandbox_status = {"success": True, "message": "Sandbox execution complete"}

    def add_decision(self, action: str, reason: str, result_summary: str):
        """Record a planner decision for the investigation timeline."""
        self.decisions.append({
            "iteration": self.iteration,
            "action": action,
            "reason": reason,
            "result_summary": result_summary,
        })

    def get_planner_summary(self) -> str:
        """Build a condensed summary for the planner.

        This is the CRITICAL interface between memory and the LLM.
        It follows the evidence-based reasoning principle: the planner
        sees structured findings, not 30 lines of Java code.

        The summary is designed to fit in ~2000 tokens so the planner
        can reason efficiently.
        """
        sections = []

        # 1. Investigation status
        sections.append(f"## Investigation Status (Iteration {self.iteration})")
        sections.append(f"Package: {self.package_name}")
        sections.append(f"APK: {self.apk_path}")

        # 2. Coverage report
        covered = [k for k, v in self.coverage.items() if v]
        not_covered = [k for k, v in self.coverage.items() if not v]
        sections.append(f"\n## Coverage")
        sections.append(f"Completed: {', '.join(covered) if covered else 'None'}")
        sections.append(f"Not yet analyzed: {', '.join(not_covered) if not_covered else 'All areas covered'}")

        # 3. Key evidence (structured, not raw)
        sections.append(f"\n## Evidence Summary")

        if self.coverage["manifest"]:
            sections.append(f"\n### Manifest")
            sections.append(f"- Permissions: {len(self.permissions)} total, {len(self.high_risk_permissions)} high-risk")
            if self.high_risk_permissions:
                # Show short permission names for readability
                short_perms = [p.split('.')[-1] for p in self.high_risk_permissions]
                sections.append(f"- High-risk: {', '.join(short_perms)}")
            if self.manifest:
                flags = self.manifest.get("manifest_flags", {})
                flag_issues = []
                if flags.get("debuggable"):
                    flag_issues.append("DEBUGGABLE")
                if flags.get("allow_backup"):
                    flag_issues.append("BACKUP_ENABLED")
                if flags.get("cleartext_traffic"):
                    flag_issues.append("CLEARTEXT_TRAFFIC")
                if flag_issues:
                    sections.append(f"- Manifest flags: {', '.join(flag_issues)}")
                exported = self.manifest.get("exported_components", [])
                if exported:
                    sections.append(f"- Exported components: {len(exported)}")

        if self.coverage["permissions_deep"] and self.manifest_vulnerabilities:
            sections.append(f"\n### Manifest Vulnerabilities ({len(self.manifest_vulnerabilities)} found)")
            for v in self.manifest_vulnerabilities[:5]:
                sections.append(f"- [{v.get('severity')}] {v.get('title')}")

        if self.coverage["source_code"]:
            app_apis = [a for a in self.api_calls if not a.get('is_library', False)]
            high = [a for a in app_apis if a.get('signal') == 'HIGH']
            medium = [a for a in app_apis if a.get('signal') == 'MEDIUM']

            sections.append(f"\n### Source Code Analysis")
            sections.append(f"- HIGH signal: {len(high)} findings")
            sections.append(f"- MEDIUM signal: {len(medium)} findings")

            for a in high[:5]:
                sections.append(f"  - [HIGH] {a['description']}: {a['api']} in {a['file']}")
            for a in medium[:3]:
                sections.append(f"  - [MEDIUM] {a['description']}: {a['api']} in {a['file']}")

            if self.hardcoded_secrets:
                sections.append(f"- Hardcoded secrets: {len(self.hardcoded_secrets)}")
                for s in self.hardcoded_secrets[:3]:
                    sections.append(f"  - {s['type']} in {s['file']}")

        if self.coverage["runtime_frida"]:
            sections.append(f"\n### Runtime Analysis")
            sections.append(f"- Events captured: {len(self.runtime_events)}")
            if self.runtime_events:
                event_types = {}
                for evt in self.runtime_events:
                    etype = evt.get('event_type', 'unknown')
                    event_types[etype] = event_types.get(etype, 0) + 1
                for etype, count in sorted(event_types.items(), key=lambda x: -x[1]):
                    sections.append(f"  - {etype}: {count} events")
            else:
                sections.append("- No monitored behaviors were triggered at runtime")

        # 4. Decision history (for context)
        if self.decisions:
            sections.append(f"\n## Previous Decisions")
            for d in self.decisions[-5:]:  # Last 5 decisions for context
                sections.append(f"- Iteration {d['iteration']}: {d['action']} — {d['reason']}")

        return "\n".join(sections)

    def get_coverage_report(self) -> dict:
        """Return coverage status for all analysis areas."""
        return dict(self.coverage)
