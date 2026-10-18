"""
LLM output parsing and language enforcement for ARGUS.

Extracted from app.py. Handles the messy reality of LLM responses:
- Truncated JSON repair
- Markdown fence stripping
- Preamble text removal
- Speculative language enforcement

These utilities are used by the planner and the report generator
to ensure consistent, evidence-based language in all outputs.
"""

import json
import datetime
import os
from pathlib import Path


# ---------- Prompt Logging ----------

# Project root is two levels up from shared/language.py
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def log_llm_prompt(agent_name, messages):
    """Log LLM prompts to disk for debugging and auditing.

    Writes to in/prompts_log.txt at the project root. This is
    invaluable for debugging prompt quality issues.
    """
    try:
        in_dir = PROJECT_ROOT / 'in'
        in_dir.mkdir(parents=True, exist_ok=True)
        log_file = in_dir / 'prompts_log.txt'
        timestamp = datetime.datetime.now().isoformat()
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"\n{'='*80}\n")
            f.write(f"TIMESTAMP: {timestamp}\n")
            f.write(f"AGENT: {agent_name}\n")
            f.write(f"{'-'*80}\n")
            for m in messages:
                f.write(f"ROLE: {m.get('role', 'unknown')}\n")
                f.write(f"CONTENT:\n{m.get('content', '')}\n")
                f.write(f"{'-'*40}\n")
    except Exception as e:
        print(f"[ERROR] Failed to log prompt: {e}")


# ---------- JSON Repair ----------

def _repair_truncated_json(raw):
    """Attempt to repair truncated JSON from an LLM that ran out of tokens.
    Closes unclosed strings, arrays, and objects.

    Strategy:
    1. Detect if we're inside an unclosed string — close it
    2. Remove trailing commas
    3. Track all open brackets/braces and close them in reverse order
    """
    # First, try to close any open string
    in_string = False
    escape_next = False
    for ch in raw:
        if escape_next:
            escape_next = False
            continue
        if ch == '\\':
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string

    if in_string:
        raw = raw.rstrip()
        if raw.endswith('\\'):
            raw = raw[:-1]
        raw += '"'

    # Remove trailing comma if present
    raw = raw.rstrip()
    if raw.endswith(','):
        raw = raw[:-1]

    # Track open brackets/braces
    stack = []
    in_str = False
    esc = False
    for ch in raw:
        if esc:
            esc = False
            continue
        if ch == '\\' and in_str:
            esc = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch in ('{', '['):
            stack.append(ch)
        elif ch == '}':
            if stack and stack[-1] == '{':
                stack.pop()
        elif ch == ']':
            if stack and stack[-1] == '[':
                stack.pop()

    # Close all unclosed brackets/braces in reverse order
    for opener in reversed(stack):
        if opener == '{':
            raw += '}'
        elif opener == '[':
            raw += ']'

    return raw


def parse_llm_json(raw):
    """Parse JSON from LLM response, handling common issues:
    - Empty responses
    - Markdown fences (```json ... ```)
    - Preamble text before the JSON
    - Trailing text after the JSON
    - Truncated responses (DeepSeek flash running out of tokens)

    This is the primary entry point for all LLM JSON parsing in ARGUS.
    """
    if not raw or not raw.strip():
        raise json.JSONDecodeError("Empty LLM response", "", 0)

    raw = raw.strip()

    # Strip markdown fences: ```json ... ``` or ``` ... ```
    if "```" in raw:
        parts = raw.split("```")
        for part in parts:
            cleaned = part.strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            if cleaned.startswith("{"):
                raw = cleaned
                break

    # If raw still doesn't start with {, try to find JSON object in the text
    if not raw.startswith("{"):
        first_brace = raw.find("{")
        last_brace = raw.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            raw = raw[first_brace:last_brace + 1]
        elif first_brace != -1:
            # Has opening brace but no closing — truncated response
            raw = raw[first_brace:]
        else:
            raise json.JSONDecodeError(
                f"No JSON object found in LLM response (first 200 chars): {raw[:200]}", raw, 0
            )

    # Attempt 1: direct parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Attempt 2: repair truncated JSON
    try:
        repaired = _repair_truncated_json(raw)
        print(f"[LLM] Attempting truncated JSON repair ({len(raw)} -> {len(repaired)} chars)", flush=True)
        result = json.loads(repaired)
        print(f"[LLM] JSON repair successful — recovered partial data", flush=True)
        return result
    except json.JSONDecodeError:
        pass

    # Attempt 3: progressively trim from the end to find a parseable subset
    for trim_marker in ['},', '],', '"}\n', '"]\n']:
        last_pos = raw.rfind(trim_marker)
        if last_pos > 0:
            candidate = raw[:last_pos + len(trim_marker) - 1]
            try:
                repaired = _repair_truncated_json(candidate)
                result = json.loads(repaired)
                print(f"[LLM] JSON recovery via trimming at char {last_pos} — partial data recovered", flush=True)
                return result
            except json.JSONDecodeError:
                continue

    # All repair attempts failed
    raise json.JSONDecodeError(
        f"JSON parse failed after repair attempts (first 300 chars): {raw[:300]}", raw, 0
    )


# ---------- Language Enforcement ----------

# Phrases that should never appear in ARGUS output.
# These are speculative or sensationalist terms that undermine
# evidence-based reporting.
FORBIDDEN_PHRASES = [
    "may ", "might ", "could ", "potentially", "likely ", "possibly",
    "suggests that", "indicates that", "appears to", "seems to",
    "aligns with", "consistent with malware", "characteristic of",
    "typical of malware", "commonly used by threat actors",
    "exfiltrate", "command and control", "privilege escalation",
    "data theft", "data exfiltration", "c2 communication",
    "c&c server", "phone home",
]


def enforce_language_rules(text):
    """Post-process LLM output to strip speculative/forbidden phrases.
    Replaces them with evidence-based alternatives where possible.

    This is applied to ALL LLM output — planner decisions, report
    findings, and chat responses.
    """
    if not isinstance(text, str):
        return text

    replacements = {
        "may ": "",
        "might ": "",
        "could ": "",
        "potentially": "",
        "likely ": "",
        "possibly": "",
        "suggests that": "evidence shows that",
        "indicates that": "shows that",
        "appears to": "",
        "seems to": "",
        "aligns with": "matches pattern of",
        "consistent with malware": "matching known threat patterns",
        "characteristic of": "matching",
        "typical of malware": "seen in threat samples",
    }

    result = text
    for phrase, replacement in replacements.items():
        result = result.replace(phrase, replacement)
        result = result.replace(phrase.capitalize(), replacement.capitalize() if replacement else "")

    # Clean up double spaces from removals
    while "  " in result:
        result = result.replace("  ", " ")

    return result.strip()


def enforce_language_on_findings(findings_dict):
    """Apply language enforcement to all string values in agent findings.
    Recursively walks dicts and lists.
    """
    if not isinstance(findings_dict, dict):
        return findings_dict
    cleaned = {}
    for key, value in findings_dict.items():
        if isinstance(value, dict):
            cleaned[key] = enforce_language_on_findings(value)
        elif isinstance(value, str):
            cleaned[key] = enforce_language_rules(value)
        elif isinstance(value, list):
            cleaned[key] = [
                enforce_language_on_findings(item) if isinstance(item, dict)
                else enforce_language_rules(item) if isinstance(item, str)
                else item
                for item in value
            ]
        else:
            cleaned[key] = value
    return cleaned
