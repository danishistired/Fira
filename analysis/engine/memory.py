"""
Investigation memory for ARGUS agentic engine.

Accumulates evidence, hypotheses, knowledge gaps, and confidence
across investigation iterations. The planner receives a condensed
summary of this state at every step — never raw data.

Design principles:
- Evidence is stored structured, never as raw text
- Hypotheses evolve across iterations (confirmed, refuted, unconfirmed)
- Knowledge gaps drive tool selection
- Confidence tracks with reasoning at every step
- Investigation journal records the full reasoning chain
- get_planner_summary() returns a condensed view optimized for LLM reasoning
"""

import json
from typing import Optional


# Cost weights for budget tracking
TOOL_COST_MAP = {
    "very_low": 1,
    "low": 2,
    "medium": 4,
    "high": 6,
}


class InvestigationMemory:
    """Accumulates evidence, hypotheses, and reasoning across investigation iterations.

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
        self.signing_info: dict = {}
        self.api_calls: list[dict] = []
        self.code_snippets: list[dict] = []
        self.hardcoded_secrets: list[dict] = []
        self.runtime_events: list[dict] = []
        self.raw_dynamic_logs: list = []
        self.manifest_xml: str = ""
        self.resource_strings: list[dict] = []
        self.correlation_matrix: list[dict] = []

        # Phase 2: Dynamic analysis evidence buckets
        self.mobsf_findings: dict = {}           # MobSF report findings
        self.network_flows: list[dict] = []      # Classified network flows from mitmproxy
        self.network_analysis: dict = {}         # parse_network_flows() output

        # OSINT triage results (VirusTotal + MalwareBazaar)
        self.osint: dict = {}

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
            "ui_automation": False,      # Full Analysis mode: LLM-guided UI exploration
            "logcat": False,
            "screenshot": False,
            "mobsf": False,              # Phase 2
            "network_capture": False,    # Phase 2
        }

        # Tools disabled mid-investigation (name -> reason). A tool sets
        # this via {"disable": True, "disable_reason": ...} in its result
        # (e.g. apktool timing out on a too-large APK). The planner must
        # never select a disabled tool again and the orchestrator skips
        # executing it defensively.
        self.disabled_tools: dict[str, str] = {}

        # Sandbox status (for backward compatibility)
        self.sandbox_status: dict = {"success": False, "message": "Not run"}

        # ---- NEW: Agentic reasoning state ----

        # Hypotheses — tracked and evolved across iterations
        # Each: {id, hypothesis, confidence, supporting, contradicting, status}
        # status: "unconfirmed" | "confirmed" | "refuted" | "investigating"
        self.hypotheses: list[dict] = []

        # Knowledge gaps — unanswered questions driving tool selection
        self.knowledge_gaps: list[str] = []

        # Confidence history — confidence + reasoning at each iteration
        # Each: {iteration, confidence, reasoning}
        self.confidence_history: list[dict] = []

        # Investigation journal — the full reasoning chain
        # Each: {iteration, thought, action, result, new_evidence, hypothesis_updates}
        self.journal: list[dict] = []

        # Budget tracking
        self._budget_spent: int = 0
        self._tool_call_count: int = 0

    def add_tool_result(self, tool_name: str, result: dict):
        """Record a tool's output and update evidence buckets.

        This is the main entry point for recording evidence. It dispatches
        to specific handlers based on tool name, extracting structured
        evidence into the appropriate buckets.
        """
        self.tool_outputs[tool_name] = result
        self._tool_call_count += 1

        # Safeguard: a tool can request to be disabled for the rest of the
        # investigation (e.g. apktool timing out on a too-large APK).
        if result.get("disable"):
            reason = result.get("disable_reason") or result.get("error", "unknown reason")
            self.disabled_tools[tool_name] = reason
            print(f"[Memory] Tool {tool_name} DISABLED for this investigation: {reason}", flush=True)

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
        elif tool_name == "run_ui_automation":
            # Bridge tool returns the same Frida-shaped result + exploration metadata.
            # Route through _ingest_frida so runtime_events, hook_coverage, etc. are
            # all captured and runtime_frida coverage is marked — the verdict engine
            # then treats this as dynamic analysis ("static_and_dynamic" scope).
            self._ingest_frida(result)
            self.coverage["ui_automation"] = True
            # Store exploration journal in a dedicated attribute if present
            if result.get("exploration"):
                self.sandbox_status = {
                    "success": True,
                    "message": (
                        f"UI automation: {result['exploration'].get('total_steps', 0)} steps, "
                        f"{result['exploration'].get('screens_explored', 0)} screens, "
                        f"stop={result['exploration'].get('stop_reason', 'unknown')}"
                    ),
                }
        elif tool_name == "run_monkey":
            self.coverage["runtime_monkey"] = True
        elif tool_name == "collect_logcat":
            self.coverage["logcat"] = True
        elif tool_name == "capture_screenshot":
            self.coverage["screenshot"] = True
        elif tool_name == "run_mobsf":
            self._ingest_mobsf(result)
        elif tool_name == "capture_network_traffic":
            self._ingest_network_flows(result)

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
        self.signing_info = result.get("signing_info", {})
        self.coverage["permissions_deep"] = True

    def _ingest_apktool(self, result: dict):
        """Extract APKTool results."""
        self.manifest_xml = result.get("manifest_xml", "")
        raw_resources = result.get("resource_entries", result.get("resource_strings", []))
        self.resource_strings = [
            item if isinstance(item, dict) else {
                "type": "url" if str(item).lower().startswith(("http://", "https://")) else "string",
                "value": str(item),
            }
            for item in raw_resources
        ]
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

    def _ingest_mobsf(self, result: dict):
        """Extract MobSF report findings into memory."""
        if result.get("skipped"):
            print("[Memory] MobSF skipped (not configured)", flush=True)
            return
        self.mobsf_findings = {
            "score": result.get("mobsf_score"),
            "api_abuse": result.get("api_abuse", []),
            "certificate_issues": result.get("certificate_issues", []),
            "hardcoded_secrets": result.get("hardcoded_secrets", []),
            "manifest_issues": result.get("manifest_issues", []),
            "malware_checks": result.get("malware_checks", []),
        }
        # Merge MobSF hardcoded secrets into the main secrets bucket
        for secret in result.get("hardcoded_secrets", []):
            if secret not in self.hardcoded_secrets:
                self.hardcoded_secrets.append(secret)
        self.coverage["mobsf"] = True
        print(f"[Memory] MobSF findings ingested. Score: {result.get('mobsf_score')}", flush=True)

    def _ingest_network_flows(self, result: dict):
        """Extract and classify captured network flows."""
        if result.get("skipped"):
            print("[Memory] Network capture skipped", flush=True)
            return
        from shared.evidence import parse_network_flows
        raw_flows = result.get("flows", [])
        self.network_flows = raw_flows
        self.network_analysis = parse_network_flows(raw_flows)
        self.coverage["network_capture"] = True
        c2_count = len(self.network_analysis.get("c2_candidates", []))
        if c2_count:
            print(f"[Memory] Network capture: {c2_count} potential C2 beaconing hosts", flush=True)
        else:
            print(f"[Memory] Network capture: {len(raw_flows)} flows, no C2 candidates", flush=True)

    def add_decision(self, action: str, reason: str, result_summary: str):
        """Record a planner decision for the investigation timeline."""
        self.decisions.append({
            "iteration": self.iteration,
            "action": action,
            "reason": reason,
            "result_summary": result_summary,
        })

    # ---- Agentic State Methods ----

    def update_hypotheses(self, hypotheses_from_planner: list[dict]):
        """Merge planner's hypothesis updates into memory.

        The planner returns its current hypotheses after every iteration.
        This method replaces the stored hypotheses with the planner's
        updated versions (the planner maintains the full state).
        """
        if not hypotheses_from_planner:
            return

        self.hypotheses = []
        for i, h in enumerate(hypotheses_from_planner):
            self.hypotheses.append({
                "id": h.get("id", f"H{i+1}"),
                "hypothesis": h.get("hypothesis", ""),
                "confidence": h.get("confidence", 0),
                "supporting": h.get("supporting", []),
                "contradicting": h.get("contradicting", []),
                "status": h.get("status", "unconfirmed"),
            })

        print(f"[Memory] Updated {len(self.hypotheses)} hypotheses", flush=True)

    def add_journal_entry(self, entry: dict):
        """Record one full reasoning cycle in the investigation journal.

        Each entry captures: thought, action, result, evidence discovered,
        and hypothesis updates — the complete reasoning trace.
        """
        entry["iteration"] = self.iteration
        self.journal.append(entry)

    def record_confidence(self, confidence: int, reasoning: str):
        """Record confidence at this iteration with reasoning."""
        self.confidence_history.append({
            "iteration": self.iteration,
            "confidence": confidence,
            "reasoning": reasoning,
        })

    def update_knowledge_gaps(self, gaps: list[str]):
        """Replace knowledge gaps with the planner's current list."""
        self.knowledge_gaps = list(gaps) if gaps else []

    def record_budget_cost(self, tool_cost: str):
        """Track budget expenditure for a tool execution."""
        self._budget_spent += TOOL_COST_MAP.get(tool_cost, 2)

    def get_budget_status(self, max_budget: int = 30) -> dict:
        """Return budget status for the planner.

        Budget is measured in cost units, not iterations:
        - very_low tools: 1 unit (manifest, permissions, logcat, screenshot)
        - low tools: 2 units (apktool)
        - medium tools: 4 units (jadx)
        - high tools: 6 units (frida, monkey)
        """
        remaining = max(0, max_budget - self._budget_spent)
        coverage_pct = round(sum(self.coverage.values()) / len(self.coverage) * 100)

        return {
            "budget_spent": self._budget_spent,
            "budget_remaining": remaining,
            "budget_total": max_budget,
            "tool_calls": self._tool_call_count,
            "coverage_percent": coverage_pct,
            "budget_exhausted": remaining <= 0,
        }

    def get_planner_summary(self) -> str:
        """Build a condensed summary for the planner.

        This is the CRITICAL interface between memory and the LLM.
        It follows the evidence-based reasoning principle: the planner
        sees structured findings, not raw code.

        Includes: evidence, hypotheses, knowledge gaps, confidence history,
        budget status. Designed to fit in ~2500 tokens.
        """
        sections = []

        # 1. Investigation status + budget
        budget = self.get_budget_status()
        sections.append(f"## Investigation Status")
        sections.append(f"Package: {self.package_name}")
        sections.append(f"Budget: {budget['budget_spent']}/{budget['budget_total']} units spent, "
                       f"{budget['budget_remaining']} remaining ({budget['coverage_percent']}% coverage)")

        # 1a. OSINT triage results (highest priority — prepend before coverage)
        if self.osint:
            sections.append(f"\n## OSINT Triage")
            vt = self.osint.get("virustotal", {})
            mb = self.osint.get("malwarebazaar", {})
            if vt.get("found"):
                sections.append(
                    f"- VirusTotal: {vt.get('detection_count',0)}/{vt.get('engine_count',1)} engines "
                    f"({vt.get('detection_ratio',0)*100:.0f}% detection rate) "
                    + ("⚠ KNOWN MALICIOUS" if vt.get('known_malicious') else "")
                )
                if vt.get('family_tags'):
                    sections.append(f"  Tags: {', '.join(vt['family_tags'])}")
            elif vt.get("skipped"):
                sections.append(f"- VirusTotal: skipped (no API key)")
            elif vt:
                sections.append(f"- VirusTotal: hash not found in database")
            if mb.get("found"):
                sections.append(
                    f"- MalwareBazaar: KNOWN MALWARE — family={mb.get('malware_family','unknown')}, "
                    f"tags={mb.get('bazaar_tags', [])}"
                )
            elif mb:
                sections.append(f"- MalwareBazaar: hash not found in database")

        # 2. Coverage report
        covered = [k for k, v in self.coverage.items() if v]
        not_covered = [k for k, v in self.coverage.items() if not v]
        sections.append(f"\n## Coverage")
        sections.append(f"Completed: {', '.join(covered) if covered else 'None'}")
        sections.append(f"Not yet analyzed: {', '.join(not_covered) if not_covered else 'All areas covered'}")

        # 2b. Disabled tools (safeguard — never select these again)
        if self.disabled_tools:
            sections.append(f"\n## Disabled Tools (safeguard)")
            sections.append("These tools failed hard and are DISABLED — do NOT select them again:")
            for name, reason in self.disabled_tools.items():
                sections.append(f"- {name}: {reason}")

        # 3. Key evidence (structured, not raw)
        sections.append(f"\n## Evidence Summary")

        if self.coverage["manifest"]:
            sections.append(f"\n### Manifest")
            sections.append(f"- Permissions: {len(self.permissions)} total, {len(self.high_risk_permissions)} high-risk")
            if self.high_risk_permissions:
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

        if self.coverage["permissions_deep"] and self.signing_info:
            si = self.signing_info
            sections.append(f"\n### Signing Certificate")
            if si.get("signed"):
                sections.append(f"- Subject: {si.get('subject', 'unknown')}")
                sections.append(f"- Self-signed: {si.get('self_signed')}")
                sections.append(f"- Validity: {si.get('not_valid_before', '?')} to {si.get('not_valid_after', '?')}")
                if si.get("is_google_play_signing_cert"):
                    sections.append("- Distribution: signed with Google Play App Signing certificate (Play Store distribution signal)")
            else:
                sections.append("- APK is NOT signed (or signature could not be parsed)")

        if self.coverage["source_code"]:
            app_apis = [a for a in self.api_calls if not a.get('is_library', False)]
            high = [a for a in app_apis if a.get('signal') == 'HIGH']
            medium = [a for a in app_apis if a.get('signal') == 'MEDIUM']

            sections.append(f"\n### Source Code Analysis")
            sections.append(f"- HIGH signal: {len(high)} findings")
            sections.append(f"- MEDIUM signal: {len(medium)} findings")

            for a in high[:5]:
                sections.append(f"  - [HIGH] {a.get('description','')}: {a.get('api','')} in {a.get('file','unknown')}")
            for a in medium[:3]:
                sections.append(f"  - [MEDIUM] {a.get('description','')}: {a.get('api','')} in {a.get('file','unknown')}")

            if self.hardcoded_secrets:
                sections.append(f"- Hardcoded secrets: {len(self.hardcoded_secrets)}")
                for s in self.hardcoded_secrets[:3]:
                    sections.append(f"  - {s.get('type','unknown')} in {s.get('file', s.get('value','unknown'))}")

        if self.coverage["apktool_resources"]:
            apktool_out = self.tool_outputs.get("run_apktool", {})
            smali = apktool_out.get("smali_analysis", {})
            native = apktool_out.get("native_libraries", [])
            assets = apktool_out.get("embedded_assets", [])
            secondary = apktool_out.get("secondary_dex_files", [])
            suspicious = apktool_out.get("suspicious_resources", [])
            urls = [r.get("value") for r in self.resource_strings if r.get("type") == "url"]

            if any([smali, native, assets, secondary, suspicious, urls]):
                sections.append(f"\n### Resource Analysis (APKTool)")
                if smali.get("total_classes"):
                    sections.append(f"- Smali: {smali['total_classes']} classes, {smali.get('dex_count', 1)} DEX files, multidex={smali.get('is_multidex', False)}")
                if native:
                    sections.append(f"- Native libraries: {len(native)} .so files")
                if assets:
                    sections.append(f"- Suspicious assets: {len(assets)} files")
                if secondary:
                    sections.append(f"- Secondary DEX files: {len(secondary)} (potential dropper)")
                for s in suspicious:
                    sections.append(f"  - [{s.get('severity')}] {s.get('finding')}")
                if urls:
                    sections.append(f"- Embedded URLs/domains in resources: {', '.join(urls[:10])}")

        if self.coverage["runtime_frida"]:
            sections.append(f"\n### Runtime Analysis")
            sections.append(f"- Events captured: {len(self.runtime_events)}")

            # Show hook coverage if available
            frida_out = self.tool_outputs.get("run_frida", {})
            hook_coverage = frida_out.get("hook_coverage", {})
            if hook_coverage:
                sections.append("- Hook coverage:")
                for hook, status in hook_coverage.items():
                    triggered = "TRIGGERED" if status.get("triggered") else "SILENT"
                    count = status.get("event_count", 0)
                    sections.append(f"  - {hook}: {triggered}" + (f" ({count} events)" if count else ""))
            elif self.runtime_events:
                event_types = {}
                for evt in self.runtime_events:
                    etype = evt.get('event_type', 'unknown')
                    event_types[etype] = event_types.get(etype, 0) + 1
                for etype, count in sorted(event_types.items(), key=lambda x: -x[1]):
                    sections.append(f"  - {etype}: {count} events")
            else:
                sections.append("- No monitored behaviors were triggered at runtime")

        # 4. Active hypotheses
        if self.hypotheses:
            sections.append(f"\n## Active Hypotheses")
            for h in self.hypotheses:
                sections.append(f"- [{h.get('status', 'unconfirmed').upper()}] {h['hypothesis']} "
                              f"(confidence: {h.get('confidence', 0)}%)")
                if h.get('supporting'):
                    sections.append(f"  Supporting: {', '.join(str(s) for s in h['supporting'][:3])}")
                if h.get('contradicting'):
                    sections.append(f"  Contradicting: {', '.join(str(c) for c in h['contradicting'][:3])}")

        # 5. Knowledge gaps
        if self.knowledge_gaps:
            sections.append(f"\n## Knowledge Gaps (unanswered questions)")
            for gap in self.knowledge_gaps:
                sections.append(f"- {gap}")

        # 6. Confidence evolution
        if self.confidence_history:
            sections.append(f"\n## Confidence History")
            for ch in self.confidence_history[-3:]:
                sections.append(f"- Iteration {ch['iteration']}: {ch['confidence']}% — {ch['reasoning']}")

        # 7. Previous decisions (for context)
        if self.decisions:
            sections.append(f"\n## Previous Decisions")
            for d in self.decisions[-5:]:
                sections.append(f"- Iteration {d['iteration']}: {d['action']} — {d['reason']}")

        return "\n".join(sections)

    def get_coverage_report(self) -> dict:
        """Return coverage status for all analysis areas."""
        return dict(self.coverage)
