"""
Evidence preprocessing for ARGUS analysis engine.

Extracted from app.py. These functions turn raw tool output into structured
evidence that the planner can reason about. They are the bridge between
"tool ran and produced raw data" and "here's what matters."

Key design decision: the planner never sees raw code or raw tool output.
It sees structured findings produced by these functions.
"""

import os
import re

from shared.constants import (
    SUSPICIOUS_API_PATTERNS,
    LIBRARY_NOISE_PATTERNS,
    LIBRARY_PATH_PREFIXES,
    HARDCODED_SECRET_PATTERNS,
    STATIC_TO_DYNAMIC_MAP,
)


def extract_api_calls_from_source(source_dir):
    """Scan decompiled Java source for suspicious API usage.
    Filters out noisy patterns from standard library paths.
    Tags each finding with is_library and signal_level (HIGH/MEDIUM/LOW).

    This is the core static code scanner. It walks every .java file
    produced by JADX and matches against SUSPICIOUS_API_PATTERNS.
    """
    found_apis = []
    if not os.path.exists(source_dir):
        return found_apis
    seen = set()
    for root, _, files in os.walk(source_dir):
        # Determine if this file lives inside a known library path
        rel_path = os.path.relpath(root, source_dir).replace("\\", "/")
        is_library = any(rel_path.startswith(pfx) or f"/{pfx}" in rel_path
                         for pfx in LIBRARY_PATH_PREFIXES)
        for f in files:
            if not f.endswith('.java'):
                continue
            file_path = os.path.join(root, f)
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as fp:
                    content = fp.read()
                    for pattern, (desc, signal_level) in SUSPICIOUS_API_PATTERNS.items():
                        # Skip noisy patterns when inside library code
                        if is_library and pattern in LIBRARY_NOISE_PATTERNS:
                            continue
                        if pattern in content:
                            key = (pattern, f)
                            if key not in seen:
                                seen.add(key)
                                found_apis.append({
                                    "api": pattern,
                                    "description": desc,
                                    "file": f,
                                    "is_library": is_library,
                                    "signal": signal_level,
                                })
            except Exception:
                pass
    return found_apis


def scan_hardcoded_secrets(source_dir):
    """Scan decompiled Java source for hardcoded secrets using regex.

    Looks for patterns like hardcoded passwords, API keys, backdoor
    credential checks, and hardcoded IP addresses.
    """
    findings = []
    if not os.path.exists(source_dir):
        return findings
    seen = set()
    for root, _, files in os.walk(source_dir):
        for fname in files:
            if not fname.endswith('.java'):
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
                    for lineno, line in enumerate(fp, 1):
                        for pattern, label in HARDCODED_SECRET_PATTERNS:
                            match = pattern.search(line)
                            if match:
                                key = (label, fname)
                                if key not in seen:
                                    seen.add(key)
                                    findings.append({
                                        "type": label,
                                        "file": fname,
                                        "line": lineno,
                                        "snippet": line.strip()[:120],
                                    })
            except Exception:
                pass
    return findings


def analyze_manifest_vulnerabilities(apk):
    """Use Androguard's parsed APK object to extract manifest-level
    vulnerability indicators. Returns a list of structured vulnerability dicts.

    Checks for: debuggable, allowBackup, cleartext traffic, exported
    components, and unprotected content providers.
    """
    vulns = []

    # 1. Debuggable flag
    try:
        if apk.get_attribute_value('application', 'debuggable') == 'true':
            vulns.append({
                "id": "MANIFEST_DEBUGGABLE",
                "severity": "HIGH",
                "title": "Application Debuggable",
                "detail": "android:debuggable=\"true\" — attackers can attach a debugger to the running process and inspect memory.",
            })
    except Exception:
        pass

    # 2. Allow Backup flag
    try:
        allow_backup = apk.get_attribute_value('application', 'allowBackup')
        if allow_backup != 'false':   # default is true if not set
            vulns.append({
                "id": "MANIFEST_ALLOW_BACKUP",
                "severity": "MEDIUM",
                "title": "Android Backup Enabled",
                "detail": f"android:allowBackup=\"{allow_backup or 'true (default)'}\" — application data can be extracted via ADB backup without root.",
            })
    except Exception:
        pass

    # 3. Network Security Config / cleartext traffic
    try:
        if apk.get_attribute_value('application', 'usesCleartextTraffic') == 'true':
            vulns.append({
                "id": "MANIFEST_CLEARTEXT_TRAFFIC",
                "severity": "MEDIUM",
                "title": "Cleartext Network Traffic Allowed",
                "detail": "android:usesCleartextTraffic=\"true\" — app explicitly permits unencrypted HTTP traffic, enabling MITM attacks.",
            })
    except Exception:
        pass

    # 4. Exported components (Activities, Services, Receivers, Providers)
    exported_components = []
    try:
        for activity in apk.get_activities():
            exported = apk.get_attribute_value('activity', 'exported', className=activity)
            if exported == 'true':
                exported_components.append(("Activity", activity))
    except Exception:
        pass
    try:
        for service in apk.get_services():
            exported = apk.get_attribute_value('service', 'exported', className=service)
            if exported == 'true':
                exported_components.append(("Service", service))
    except Exception:
        pass
    try:
        for receiver in apk.get_receivers():
            exported = apk.get_attribute_value('receiver', 'exported', className=receiver)
            if exported == 'true':
                exported_components.append(("Receiver", receiver))
    except Exception:
        pass
    try:
        for provider in apk.get_providers():
            exported = apk.get_attribute_value('provider', 'exported', className=provider)
            if exported == 'true':
                exported_components.append(("Provider (Content Provider)", provider))
    except Exception:
        pass

    if exported_components:
        component_list = "; ".join(f"{ctype}: {cname}" for ctype, cname in exported_components[:10])
        vulns.append({
            "id": "MANIFEST_EXPORTED_COMPONENTS",
            "severity": "HIGH" if len(exported_components) > 3 else "MEDIUM",
            "title": f"Exported Components ({len(exported_components)} found)",
            "detail": f"Components accessible to other apps without permission: {component_list}",
        })

    # 5. Insecure Content Providers (exported + no readPermission/writePermission)
    try:
        for provider in apk.get_providers():
            exported = apk.get_attribute_value('provider', 'exported', className=provider)
            read_perm = apk.get_attribute_value('provider', 'readPermission', className=provider)
            write_perm = apk.get_attribute_value('provider', 'writePermission', className=provider)
            if exported == 'true' and not read_perm and not write_perm:
                vulns.append({
                    "id": "MANIFEST_UNPROTECTED_PROVIDER",
                    "severity": "HIGH",
                    "title": "Unprotected Content Provider",
                    "detail": f"Content provider '{provider}' is exported but has no readPermission or writePermission set — any app can read/write its data.",
                })
    except Exception:
        pass

    return vulns


def collect_code_snippets(source_dir, api_calls, max_snippets=10, context_lines=5):
    """Collect short code snippets around suspicious API calls for LLM context.
    Only collects snippets for app code (not libraries) and HIGH/MEDIUM signal APIs.

    These snippets give the planner targeted context about HOW a suspicious
    API is being used, without dumping entire source files.
    """
    snippets = []
    if not os.path.exists(source_dir) or not api_calls:
        return snippets
    # Only target app code (not libraries) and HIGH/MEDIUM signal (not LOW noise)
    eligible = [
        a for a in api_calls
        if not a.get('is_library', False) and a.get('signal', 'HIGH') != 'LOW'
    ]
    # Build a set of (api_pattern, filename) pairs to find
    targets = {(a['api'], a['file']) for a in eligible[:max_snippets]}
    for root, _, files in os.walk(source_dir):
        for fname in files:
            if not fname.endswith('.java'):
                continue
            matching = [(api, fn) for api, fn in targets if fn == fname]
            if not matching:
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
                    lines = fp.readlines()
                for api_pattern, _ in matching:
                    for i, line in enumerate(lines):
                        if api_pattern in line:
                            start = max(0, i - context_lines)
                            end = min(len(lines), i + context_lines + 1)
                            snippet = ''.join(lines[start:end])
                            snippets.append({
                                "file": fname,
                                "api": api_pattern,
                                "line": i + 1,
                                "code": snippet[:800]  # cap length
                            })
                            break  # one snippet per api per file
            except Exception:
                pass
    return snippets[:max_snippets]


def parse_frida_logs(raw_logs):
    """Parse raw Frida log strings into structured typed events.
    This makes dynamic evidence machine-readable instead of dumping raw strings.

    Each log line is classified into an event_type (command_execution, sms,
    crypto, network, base64, file_access, or unknown) with timestamp extraction.
    """
    if not raw_logs:
        return []

    EVENT_PATTERNS = [
        (re.compile(r'Command Execution: Runtime\.exec\((.+)\)'), 'command_execution'),
        (re.compile(r'SMS Manager: Sending SMS to (.+)'), 'sms'),
        (re.compile(r'Crypto API: (.+)'), 'crypto'),
        (re.compile(r'Network Connection: Opening URL -> (.+)'), 'network'),
        (re.compile(r'Obfuscation/Data: Base64 decode (.+)'), 'base64'),
        (re.compile(r'File Access: new File\("(.+)"\)'), 'file_access'),
    ]

    parsed = []
    for log_line in raw_logs:
        if not isinstance(log_line, str):
            continue

        # Extract timestamp if present: [2026-06-11T...] rest
        timestamp = ""
        detail = log_line
        ts_match = re.match(r'\[([^\]]+)\]\s*(.*)', log_line)
        if ts_match:
            timestamp = ts_match.group(1)
            detail = ts_match.group(2)

        event_type = "unknown"
        for pattern, etype in EVENT_PATTERNS:
            if pattern.search(detail):
                event_type = etype
                break

        # Skip Frida system messages (hook injection confirmations, errors about hooking)
        if detail.startswith("Frida hooks injected") or detail.startswith("Failed to hook"):
            continue
        if detail.startswith("Waiting for Java VM"):
            continue

        parsed.append({
            "event_type": event_type,
            "timestamp": timestamp,
            "detail": detail,
            "raw": log_line,
        })

    return parsed


def build_correlation_matrix(api_calls, dynamic_logs, sandbox_status):
    """Deterministically correlate static API findings with dynamic Frida observations.
    No LLM needed — this is pure pattern matching.

    Returns a list of correlation entries showing which static capabilities
    were validated (or not) by runtime evidence.
    """
    correlations = []
    dynamic_ran = sandbox_status and sandbox_status.get('success', False)
    parsed_events = parse_frida_logs(dynamic_logs) if dynamic_logs else []

    # Group dynamic events by type for fast lookup
    dynamic_by_type = {}
    for evt in parsed_events:
        etype = evt['event_type']
        if etype not in dynamic_by_type:
            dynamic_by_type[etype] = []
        dynamic_by_type[etype].append(evt)

    # For each static API finding, check if there's a matching dynamic event
    seen_capabilities = set()  # Deduplicate by capability category
    for api_finding in api_calls:
        desc = api_finding.get('description', '')
        expected_event_type = STATIC_TO_DYNAMIC_MAP.get(desc)

        if not expected_event_type:
            continue  # No correlation mapping for this API type

        # Deduplicate — only one correlation entry per capability category
        if desc in seen_capabilities:
            continue
        seen_capabilities.add(desc)

        static_evidence = f"{api_finding['api']} in {api_finding['file']}"

        if not dynamic_ran:
            correlations.append({
                "capability": desc,
                "static_evidence": static_evidence,
                "dynamic_evidence": "Dynamic analysis was not performed",
                "status": "NOT_TESTED",
                "risk_assessment": f"Static capability detected. Runtime validation required.",
            })
        elif expected_event_type in dynamic_by_type:
            matching_events = dynamic_by_type[expected_event_type]
            dynamic_evidence = matching_events[0]['detail']
            correlations.append({
                "capability": desc,
                "static_evidence": static_evidence,
                "dynamic_evidence": dynamic_evidence,
                "status": "VALIDATED",
                "risk_assessment": f"Static capability confirmed by runtime observation. Elevated risk.",
            })
        else:
            correlations.append({
                "capability": desc,
                "static_evidence": static_evidence,
                "dynamic_evidence": f"No {expected_event_type} activity observed in {len(parsed_events)} total events",
                "status": "NOT_VALIDATED",
                "risk_assessment": f"Code exists but was not triggered during {len(parsed_events)}-event observation window.",
            })

    validated_count = sum(1 for c in correlations if c['status'] == 'VALIDATED')
    not_validated_count = sum(1 for c in correlations if c['status'] == 'NOT_VALIDATED')
    not_tested_count = sum(1 for c in correlations if c['status'] == 'NOT_TESTED')

    print(f"[Correlation] {len(correlations)} entries: "
          f"{validated_count} validated, {not_validated_count} not validated, "
          f"{not_tested_count} not tested", flush=True)

    return correlations


# ======================================================
# Phase 2: Network flow analysis
# ======================================================

_BENIGN_DOMAIN_SUFFIXES = (
    ".googleapis.com", ".gstatic.com", ".google.com", ".firebase.io",
    ".firebaseio.com", ".firebaseapp.com", ".cloudflare.com", ".fastly.net",
    ".akamaized.net", ".amazonaws.com", ".cloudfront.net",
    ".crashlytics.com", ".fabric.io", ".applovin.com", ".admob.com",
    ".doubleclick.net", ".facebook.com", ".instagram.com",
    ".apple.com", ".icloud.com", ".microsoft.com",
)

_ANALYTICS_TOKENS = (
    "analytics", "telemetry", "metrics", "stats", "tracking",
    "adjust.com", "appsflyer.com", "branch.io", "segment.io",
)

_SUSPICIOUS_HOST_RE = re.compile(
    r"(\d{1,3}\.){3}\d{1,3}"
    r"|dyn\.?dns|no-?ip\.org|freedns"
    r"|pastebin\.com|hastebin\.com"
    r"|\.onion$",
    re.IGNORECASE,
)


def parse_network_flows(flows: list) -> dict:
    """Classify raw network flow objects from the NetworkCaptureTool.

    Tags each flow as cdn / analytics / c2_beacon / suspicious / unknown.
    Detects beaconing via repeated POST to non-CDN hosts (>=3 calls).
    Returns classified flows, suspicious highlights, and analyst summary.
    """
    if not flows:
        return {
            "classified_flows": [],
            "suspicious_flows": [],
            "c2_candidates": [],
            "unique_domains": [],
            "unique_ips": [],
            "summary": "No network flows captured.",
        }

    classified = []
    host_freq = {}

    for flow in flows:
        host = flow.get("host", "")
        if not host:
            continue
        method = flow.get("method", "GET")
        ts = flow.get("timestamp", "")
        host_freq.setdefault(host, []).append((method, ts))

        host_lower = host.lower()
        if any(host_lower.endswith(sfx) for sfx in _BENIGN_DOMAIN_SUFFIXES):
            classification = "cdn"
        elif any(token in host_lower for token in _ANALYTICS_TOKENS):
            classification = "analytics"
        elif _SUSPICIOUS_HOST_RE.search(host):
            classification = "suspicious"
        else:
            classification = "unknown"

        classified.append({**flow, "classification": classification})

    # Beaconing: host with >=3 POST to non-CDN/analytics
    c2_candidates = []
    for host, calls in host_freq.items():
        posts = [c for c in calls if c[0] == "POST"]
        h = host.lower()
        is_benign = (
            any(h.endswith(sfx) for sfx in _BENIGN_DOMAIN_SUFFIXES)
            or any(tok in h for tok in _ANALYTICS_TOKENS)
        )
        if len(posts) >= 3 and not is_benign:
            c2_candidates.append({
                "host": host,
                "post_count": len(posts),
                "verdict": "potential_c2_beacon",
                "detail": f"{len(posts)} POST requests to non-CDN host - possible C2 beaconing",
            })
            for f in classified:
                if f.get("host") == host:
                    f["classification"] = "c2_beacon"

    suspicious_flows = [f for f in classified if f["classification"] in ("suspicious", "c2_beacon")]
    unique_domains = sorted({f["host"] for f in classified if not re.match(r"^\d", f.get("host", ""))})
    unique_ips = sorted({f["host"] for f in classified if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", f.get("host", ""))})

    parts = [f"Analysed {len(classified)} network flows."]
    if c2_candidates:
        parts.append(f"{len(c2_candidates)} potential C2 beacon hosts: {', '.join(x['host'] for x in c2_candidates[:3])}.")
    if unique_ips:
        parts.append(f"Raw IP connections (DNS-bypass): {', '.join(unique_ips[:5])}.")
    if not suspicious_flows and not c2_candidates and not unique_ips:
        parts.append("No suspicious network destinations identified.")

    return {
        "classified_flows": classified[:50],
        "suspicious_flows": suspicious_flows[:20],
        "c2_candidates": c2_candidates,
        "unique_domains": unique_domains[:30],
        "unique_ips": unique_ips[:20],
        "summary": " ".join(parts),
    }