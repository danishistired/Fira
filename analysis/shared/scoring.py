"""
Risk scoring and confidence engine for ARGUS.

Computes two distinct metrics:
1. **Risk Score** (0-99): How dangerous is this APK?
   Multi-dimensional composite across 7 weighted categories:
   permissions, static code, manifest security, hardcoded secrets,
   runtime behavior, static-dynamic correlation, and OSINT intelligence.

2. **Evidence Confidence** (0-95): How much can we trust this assessment?
   Based on analysis coverage breadth, correlation validation,
   OSINT corroboration, scope, and hypothesis convergence — NOT risk level.

Both are deterministic (no LLM). They serve as anchoring data for the
consensus LLM and as post-processing guard-rails.
"""

from shared.constants import API_SCORE_WEIGHTS


# ── Dimension weights (must sum to 1.0) ──────────────────────────
_WEIGHTS = {
    "permissions":      0.12,
    "static_code":      0.20,
    "manifest":         0.10,
    "secrets":          0.08,
    "runtime":          0.20,
    "correlation":      0.15,
    "osint":            0.15,
}

# ── Combination bonus patterns ────────────────────────────────────
# (frozenset of API patterns) → (label, bonus points added to static_code raw)
_COMBO_BONUSES = [
    # C2 exfiltration pattern: SMS + network access
    ({"SmsManager", "HttpURLConnection"}, "C2 exfiltration (SMS + network)", 15),
    ({"SmsManager", "OkHttpClient"},     "C2 exfiltration (SMS + network)", 15),
    ({"sendTextMessage", "HttpURLConnection"}, "C2 exfiltration (SMS + network)", 15),
    # Dropper pattern: dynamic loading + command execution
    ({"DexClassLoader", "Runtime.getRuntime().exec"}, "Dropper (DEX load + exec)", 20),
    ({"DexClassLoader", "ProcessBuilder"},            "Dropper (DEX load + exec)", 20),
    # Spyware pattern: location + contacts + network
    ({"getLastKnownLocation", "HttpURLConnection"},   "Spyware (location exfil)", 12),
    ({"requestLocationUpdates", "HttpURLConnection"}, "Spyware (tracking + exfil)", 12),
    # Ransomware/locker pattern
    ({"DevicePolicyManager", "lockNow"},              "Device locker (ransomware)", 20),
    # Accessibility abuse
    ({"AccessibilityService", "onAccessibilityEvent"}, "Accessibility abuse (keylogging)", 15),
    # Overlay attack
    ({"AccessibilityService", "SYSTEM_ALERT_WINDOW"}, "Overlay attack (phishing)", 15),
]

# ── Secret severity tiers ─────────────────────────────────────────
_SECRET_SEVERITY = {
    "Backdoor Credential Check": 25,
    "Hardcoded Private Key":     20,
    "Developer/Master Password": 18,
    "Hardcoded Database Password": 16,
    "Hardcoded Password":        12,
    "Hardcoded API Key":         10,
    "Hardcoded Secret/Token":    10,
    "Hardcoded Username":         5,
    "Hardcoded IP Address URL":   8,
}


# ══════════════════════════════════════════════════════════════════
#  RISK SCORE
# ══════════════════════════════════════════════════════════════════

def compute_risk_assessment(
    permissions: list,
    high_risk_permissions: list,
    api_calls: list,
    manifest_vulns: list,
    hardcoded_secrets: list,
    dynamic_logs: list | None = None,
    correlations: list | None = None,
    osint: dict | None = None,
    analysis_scope: str = "static_only",
) -> dict:
    """Compute multi-dimensional risk score with full breakdown.

    Returns:
        {
            "score": float (0-99),
            "breakdown": str (human-readable calculation),
            "dimensions": {name: {"raw": 0-100, "weighted": 0-N, "detail": str}, ...},
            "combo_bonuses": [str, ...],
        }
    """
    dims = {}
    combo_bonuses_triggered = []

    # ── 1. Permission Risk (0-100) ─────────────────────────
    perm_raw = 0
    perm_detail_parts = []
    if permissions:
        ratio = len(high_risk_permissions) / max(len(permissions), 1)
        perm_raw = min(100, ratio * 120)  # Slightly over-scale so 10+ high-risk hits 100
        perm_detail_parts.append(f"{len(high_risk_permissions)}/{len(permissions)} high-risk")

        # Dangerous permission combinations
        perm_set = set(p.split(".")[-1] for p in high_risk_permissions)
        if {"SEND_SMS", "INTERNET"} <= {p.split(".")[-1] for p in permissions}:
            if "SEND_SMS" in perm_set:
                perm_raw = min(100, perm_raw + 20)
                perm_detail_parts.append("SMS+INTERNET combo")
        if {"CAMERA", "RECORD_AUDIO"} <= perm_set:
            perm_raw = min(100, perm_raw + 15)
            perm_detail_parts.append("Camera+Audio combo")
        if {"READ_CONTACTS", "INTERNET"} <= {p.split(".")[-1] for p in permissions}:
            if "READ_CONTACTS" in perm_set:
                perm_raw = min(100, perm_raw + 10)
                perm_detail_parts.append("Contacts exfil risk")

    dims["permissions"] = {
        "raw": round(perm_raw, 1),
        "weighted": round(perm_raw * _WEIGHTS["permissions"], 2),
        "detail": "; ".join(perm_detail_parts) or "No permissions",
    }

    # ── 2. Static Code Analysis (0-100) ────────────────────
    code_raw = 0
    code_detail_parts = []
    app_apis_found = set()
    for a in api_calls:
        if a.get("is_library", False):
            continue
        w = API_SCORE_WEIGHTS.get(a["api"], 0)
        code_raw += w
        if w > 0:
            app_apis_found.add(a["api"])

    # Combination bonuses
    for combo_set, label, bonus in _COMBO_BONUSES:
        if combo_set <= app_apis_found:
            code_raw += bonus
            combo_bonuses_triggered.append(label)
            code_detail_parts.append(f"+{bonus} {label}")

    high_count = sum(1 for a in api_calls if not a.get("is_library") and a.get("signal") == "HIGH")
    med_count = sum(1 for a in api_calls if not a.get("is_library") and a.get("signal") == "MEDIUM")
    code_detail_parts.insert(0, f"{high_count} HIGH + {med_count} MEDIUM findings")
    code_raw = min(100, code_raw)

    dims["static_code"] = {
        "raw": round(code_raw, 1),
        "weighted": round(code_raw * _WEIGHTS["static_code"], 2),
        "detail": "; ".join(code_detail_parts),
    }

    # ── 3. Manifest Security (0-100) ──────────────────────
    manifest_raw = 0
    manifest_detail_parts = []
    for v in (manifest_vulns or []):
        vid = v.get("id", "")
        sev = v.get("severity", "")
        if vid == "MANIFEST_UNPROTECTED_PROVIDER":
            manifest_raw += 30
            manifest_detail_parts.append("Unprotected provider")
        elif vid == "MANIFEST_EXPORTED_COMPONENTS":
            exported_count = 0
            title = v.get("title", "")
            # Try to parse count from title like "Exported Components (5 found)"
            import re
            m = re.search(r"\((\d+)", title)
            if m:
                exported_count = int(m.group(1))
            manifest_raw += min(25, 5 * max(exported_count, 1))
            manifest_detail_parts.append(f"{exported_count or '?'} exported components")
        elif vid == "MANIFEST_DEBUGGABLE":
            manifest_raw += 20
            manifest_detail_parts.append("Debuggable")
        elif vid == "MANIFEST_CLEARTEXT_TRAFFIC":
            manifest_raw += 10
            manifest_detail_parts.append("Cleartext traffic")
        elif vid == "MANIFEST_ALLOW_BACKUP":
            manifest_raw += 5
            manifest_detail_parts.append("Backup enabled")
        elif sev == "HIGH":
            manifest_raw += 15
        elif sev == "MEDIUM":
            manifest_raw += 8

    manifest_raw = min(100, manifest_raw)
    dims["manifest"] = {
        "raw": round(manifest_raw, 1),
        "weighted": round(manifest_raw * _WEIGHTS["manifest"], 2),
        "detail": "; ".join(manifest_detail_parts) or "No manifest vulnerabilities",
    }

    # ── 4. Hardcoded Secrets (0-100) ────────────────────────
    secrets_raw = 0
    secrets_detail_parts = []
    for s in (hardcoded_secrets or []):
        stype = s.get("type", "")
        severity = _SECRET_SEVERITY.get(stype, 8)
        secrets_raw += severity
        if severity >= 15:
            secrets_detail_parts.append(stype)

    secrets_raw = min(100, secrets_raw)
    if hardcoded_secrets:
        secrets_detail_parts.insert(0, f"{len(hardcoded_secrets)} secrets found")

    dims["secrets"] = {
        "raw": round(secrets_raw, 1),
        "weighted": round(secrets_raw * _WEIGHTS["secrets"], 2),
        "detail": "; ".join(secrets_detail_parts) or "No hardcoded secrets",
    }

    # ── 5. Runtime Behavior (0-100) ─────────────────────────
    runtime_raw = 0
    runtime_detail_parts = []
    dynamic_ran = analysis_scope in ("static_and_dynamic", "autonomous_dynamic")

    if dynamic_ran and dynamic_logs:
        parsed_events = [
            l for l in dynamic_logs
            if isinstance(l, str) and not l.startswith("Frida")
        ]
        event_count = len(parsed_events)

        if event_count > 0:
            # Scale: 1-5 events = 20, 6-15 = 40, 16-30 = 60, 30+ = 80
            if event_count >= 30:
                runtime_raw = 80
            elif event_count >= 16:
                runtime_raw = 60
            elif event_count >= 6:
                runtime_raw = 40
            else:
                runtime_raw = 20

            runtime_detail_parts.append(f"{event_count} Frida events captured")
        else:
            # Dynamic ran but nothing triggered - this is actually good signal
            runtime_raw = 0
            runtime_detail_parts.append("Dynamic analysis ran, no events triggered (clean)")
    elif dynamic_ran:
        runtime_raw = 0
        runtime_detail_parts.append("Dynamic analysis ran, no events")
    else:
        # No dynamic analysis - this dimension is neutral (0), but weight still
        # applies, so static-only analysis naturally scores lower overall
        runtime_raw = 0
        runtime_detail_parts.append("No dynamic analysis performed")

    dims["runtime"] = {
        "raw": round(runtime_raw, 1),
        "weighted": round(runtime_raw * _WEIGHTS["runtime"], 2),
        "detail": "; ".join(runtime_detail_parts),
    }

    # ── 6. Static-Dynamic Correlation (0-100) ───────────────
    corr_raw = 0
    corr_detail_parts = []
    corrs = correlations or []
    validated = [c for c in corrs if c.get("status") == "VALIDATED"]
    not_validated = [c for c in corrs if c.get("status") == "NOT_VALIDATED"]
    not_tested = [c for c in corrs if c.get("status") == "NOT_TESTED"]

    if validated:
        # Each validated correlation is strong evidence: 20 points
        corr_raw += min(80, len(validated) * 20)
        corr_detail_parts.append(f"{len(validated)} VALIDATED")
    if not_validated:
        # Code exists but didn't trigger: mild signal (code could be dead/conditional)
        corr_raw += min(20, len(not_validated) * 5)
        corr_detail_parts.append(f"{len(not_validated)} NOT_VALIDATED")
    if not_tested:
        # Untested capabilities: moderate uncertainty signal
        corr_raw += min(30, len(not_tested) * 8)
        corr_detail_parts.append(f"{len(not_tested)} NOT_TESTED")

    corr_raw = min(100, corr_raw)
    dims["correlation"] = {
        "raw": round(corr_raw, 1),
        "weighted": round(corr_raw * _WEIGHTS["correlation"], 2),
        "detail": "; ".join(corr_detail_parts) or "No correlations available",
    }

    # ── 7. OSINT Intelligence (0-100) ────────────────────────
    osint_raw = 0
    osint_detail_parts = []
    osint_data = osint or {}
    vt = osint_data.get("virustotal", {})
    mb = osint_data.get("malwarebazaar", {})

    if vt.get("found"):
        detection_ratio = vt.get("detection_ratio", 0)
        # Scale VT detection ratio to 0-70 contribution
        vt_score = min(70, detection_ratio * 100)
        osint_raw += vt_score
        det_count = vt.get("detection_count", 0)
        eng_count = vt.get("engine_count", 1)
        osint_detail_parts.append(f"VT: {det_count}/{eng_count} ({detection_ratio*100:.0f}%)")
        if vt.get("known_malicious"):
            osint_raw += 20
            osint_detail_parts.append("VT: KNOWN MALICIOUS")
        if vt.get("family_tags"):
            osint_raw += 10
            osint_detail_parts.append(f"VT families: {', '.join(vt['family_tags'][:3])}")
    elif vt.get("skipped"):
        osint_detail_parts.append("VT: skipped (no API key)")
    else:
        # Hash not found = neutral (not suspicious, not exonerating)
        osint_detail_parts.append("VT: hash not in database")

    if mb.get("found"):
        osint_raw += 30
        osint_detail_parts.append(f"MalwareBazaar: KNOWN ({mb.get('malware_family', '?')})")

    osint_raw = min(100, osint_raw)
    dims["osint"] = {
        "raw": round(osint_raw, 1),
        "weighted": round(osint_raw * _WEIGHTS["osint"], 2),
        "detail": "; ".join(osint_detail_parts) or "No OSINT data",
    }

    # ── Composite Score ─────────────────────────────────────
    composite = sum(d["weighted"] for d in dims.values())

    # Scope penalty: static-only caps at 70
    scope_cap = None
    if analysis_scope == "static_only" and composite > 70:
        scope_cap = 70
        composite = 70

    final_score = round(min(99, max(0, composite)), 1)

    # ── Human-readable breakdown ─────────────────────────────
    breakdown_parts = []
    for name, dim in dims.items():
        w_pct = int(_WEIGHTS[name] * 100)
        breakdown_parts.append(f"{name}: {dim['raw']:.0f} x {w_pct}% = {dim['weighted']:.1f}")
    breakdown_line = " + ".join(breakdown_parts)
    breakdown = f"Composite: {breakdown_line} = {composite:.1f}"
    if scope_cap is not None:
        breakdown += f" (capped at {scope_cap} for static-only)"
    if combo_bonuses_triggered:
        breakdown += f" | Combos: {', '.join(combo_bonuses_triggered)}"

    return {
        "score": final_score,
        "breakdown": breakdown,
        "dimensions": dims,
        "combo_bonuses": combo_bonuses_triggered,
    }


def compute_risk_score(permissions, high_risk_permissions, api_calls,
                       manifest_vulns, hardcoded_secrets, dynamic_logs=None):
    """Backward-compatible wrapper: returns just the float score.

    Callers that need the full breakdown should use compute_risk_assessment().
    """
    result = compute_risk_assessment(
        permissions, high_risk_permissions, api_calls,
        manifest_vulns, hardcoded_secrets, dynamic_logs,
    )
    return result["score"]


# ══════════════════════════════════════════════════════════════════
#  EVIDENCE CONFIDENCE
# ══════════════════════════════════════════════════════════════════

def compute_confidence(
    coverage: dict,
    correlations: list | None = None,
    osint: dict | None = None,
    analysis_scope: str = "static_only",
    hypotheses: list | None = None,
    risk_score: float = 0,
) -> dict:
    """Compute deterministic evidence confidence.

    Confidence measures how much we can TRUST the assessment, not how
    dangerous the APK is. A fully-analyzed benign app should have high
    confidence. A suspicious static-only analysis should have lower confidence.

    Returns:
        {
            "confidence": int (0-95),
            "breakdown": str,
            "factors": {name: contribution, ...},
        }
    """
    factors = {}
    total = 30  # Base
    factors["base"] = 30

    # Coverage breadth: +5% per analysis area covered
    covered_count = sum(1 for v in coverage.values() if v)
    total_areas = len(coverage)
    coverage_bonus = covered_count * 5
    total += coverage_bonus
    factors["coverage"] = coverage_bonus
    factors["coverage_detail"] = f"{covered_count}/{total_areas} areas"

    # Correlation evidence
    corrs = correlations or []
    validated = sum(1 for c in corrs if c.get("status") == "VALIDATED")
    not_validated = sum(1 for c in corrs if c.get("status") == "NOT_VALIDATED")
    corr_bonus = min(25, validated * 8)
    # NOT_VALIDATED also adds confidence (we know the code exists but didn't trigger)
    corr_bonus += min(5, not_validated * 2)
    total += corr_bonus
    factors["correlations"] = corr_bonus
    factors["correlations_detail"] = f"{validated} validated, {not_validated} not validated"

    # OSINT corroboration
    osint_data = osint or {}
    vt = osint_data.get("virustotal", {})
    mb = osint_data.get("malwarebazaar", {})
    osint_bonus = 0
    if vt.get("found"):
        osint_bonus += 8  # VT has data = we have external intelligence
    if mb.get("found"):
        osint_bonus += 7  # MB has data = strong corroboration
    total += osint_bonus
    factors["osint"] = osint_bonus

    # Hypothesis convergence: if the planner's hypotheses are mostly confirmed
    hyps = hypotheses or []
    confirmed = sum(1 for h in hyps if h.get("status") == "confirmed")
    if confirmed >= 3:
        total += 5
        factors["hypothesis_convergence"] = 5
    elif confirmed >= 1:
        total += 2
        factors["hypothesis_convergence"] = 2
    else:
        factors["hypothesis_convergence"] = 0

    # Scope multiplier (applied to the bonus portion, not base)
    if analysis_scope == "static_only":
        # Static-only confidence is fundamentally limited
        bonus_portion = total - 30
        bonus_portion = int(bonus_portion * 0.70)
        total = 30 + bonus_portion
        factors["scope_penalty"] = "static_only (x0.70 on bonus)"
    elif analysis_scope in ("static_and_dynamic", "autonomous_dynamic"):
        factors["scope_penalty"] = "none (dynamic analysis performed)"

    # Cap
    confidence = min(95, max(10, total))
    factors["raw_total"] = total

    # Breakdown string
    parts = [f"Base {factors['base']}"]
    parts.append(f"+ coverage {factors['coverage']} ({factors['coverage_detail']})")
    parts.append(f"+ correlations {factors['correlations']} ({factors['correlations_detail']})")
    parts.append(f"+ osint {factors['osint']}")
    parts.append(f"+ hypothesis {factors['hypothesis_convergence']}")
    if "static_only" in str(factors.get("scope_penalty", "")):
        parts.append(f"x0.70 scope penalty")
    parts.append(f"= {confidence}%")
    breakdown = " ".join(parts)

    return {
        "confidence": confidence,
        "breakdown": breakdown,
        "factors": factors,
    }
