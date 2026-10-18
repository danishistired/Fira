"""
Risk scoring engine for ARGUS.

Extracted from app.py (lines 1372-1452). Computes a deterministic risk score
based on permissions, API findings, manifest vulnerabilities, hardcoded
secrets, and dynamic activity. No LLM involved — pure rule-based scoring.
"""

from shared.constants import API_SCORE_WEIGHTS


def compute_risk_score(permissions, high_risk_permissions, api_calls,
                       manifest_vulns, hardcoded_secrets, dynamic_logs=None):
    """Compute the rule-based risk score for an APK.

    Each factor contributes a weighted amount, capped per category
    to prevent any single factor from dominating:
    - Permissions: up to 15 points (proportional to high-risk ratio)
    - API findings: up to 40 points (per-finding weighted, app code only)
    - Manifest vulns: variable (20 for unprotected providers, 10 for exports)
    - Hardcoded secrets: up to 15 points (5 per finding)
    - Dynamic activity: 15 bonus points if real events were captured

    Returns a float between 0 and 99.
    """
    score = 0

    # Permission contribution: proportional but capped at 15
    if permissions:
        score += min(15, (len(high_risk_permissions) / len(permissions)) * 15)

    # API contribution: per-finding weighted, app code only
    api_score = 0
    for a in api_calls:
        if a.get('is_library', False):
            continue
        api_score += API_SCORE_WEIGHTS.get(a['api'], 0)
    score += min(40, api_score)  # cap API contribution at 40

    # Manifest vulns: exported components and unprotected providers are serious
    for v in (manifest_vulns or []):
        if v.get('id') == 'MANIFEST_UNPROTECTED_PROVIDER':
            score += 20
        elif v.get('id') == 'MANIFEST_EXPORTED_COMPONENTS':
            score += 10
        elif v.get('severity') == 'HIGH':
            score += 5
        elif v.get('severity') == 'MEDIUM':
            score += 2

    # Hardcoded secrets
    if hardcoded_secrets:
        score += min(15, len(hardcoded_secrets) * 5)

    # Dynamic activity bonus — only if actual events were captured
    parsed_dynamic_events = [
        l for l in (dynamic_logs or [])
        if isinstance(l, str) and not l.startswith("Frida")
    ]
    if parsed_dynamic_events:
        score += 15

    return round(min(99, score), 2)
