import os
import tempfile
import subprocess
import shutil
import logging
import json
import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

# Import the new sandbox module
from sandbox import SandboxOrchestrator

# Load .env from the same directory as this script
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

# Suppress androguard's extremely verbose DEBUG output
logging.getLogger('androguard').setLevel(logging.WARNING)

try:
    # pyrefly: ignore [import, missing-import]
    from androguard.core.bytecodes.apk import APK
except ImportError:
    # pyrefly: ignore [missing-import]
    from androguard.core.apk import APK

app = Flask(__name__)
CORS(app)

# ---------- DeepSeek LLM Client ----------
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
if DEEPSEEK_API_KEY:
    llm_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")
    print("[INIT] DeepSeek client initialized", flush=True)
else:
    llm_client = None
    print("[INIT] WARNING: No DEEPSEEK_API_KEY found, LLM features disabled", flush=True)

# ---------- Java / Tool Paths ----------
java_path = r"C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot\bin"
if os.path.exists(java_path) and java_path not in os.environ["PATH"]:
    os.environ["PATH"] = java_path + os.pathsep + os.environ["PATH"]

HIGH_RISK_PERMISSIONS = {
    "android.permission.SEND_SMS",
    "android.permission.RECEIVE_SMS",
    "android.permission.READ_SMS",
    "android.permission.WRITE_SMS",
    "android.permission.RECORD_AUDIO",
    "android.permission.CAMERA",
    "android.permission.READ_CONTACTS",
    "android.permission.WRITE_CONTACTS",
    "android.permission.READ_CALL_LOG",
    "android.permission.WRITE_CALL_LOG",
    "android.permission.CALL_PHONE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.PROCESS_OUTGOING_CALLS",
    "android.permission.READ_PHONE_STATE",
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.REQUEST_INSTALL_PACKAGES",
    "android.permission.GET_ACCOUNTS",
}

# ----------------------------------------------------------------
# Patterns: API calls (string search in .java files)
# Signal levels: HIGH = always send to LLM, MEDIUM = send but lower priority,
#                LOW = counted but not individually listed to LLM
# APIs that are normal Android behavior (startActivity, getIntent, Log.*,
# System.out.println, registerReceiver, sendBroadcast) are NOT tracked at all.
# ----------------------------------------------------------------
SUSPICIOUS_API_PATTERNS = {
    # --- HIGH SIGNAL: genuine threat indicators ---
    # Telephony / SMS
    "SmsManager":                      ("SMS Operations", "HIGH"),
    "sendTextMessage":                  ("SMS Sending", "HIGH"),
    "getSubscriberId":                  ("IMSI Extraction", "HIGH"),
    "getDeviceId":                      ("IMEI/Device ID Extraction", "HIGH"),
    "getLine1Number":                   ("Phone Number Extraction", "HIGH"),
    # Command execution
    "Runtime.getRuntime().exec":        ("OS Command Execution", "HIGH"),
    "ProcessBuilder":                   ("Process Spawning", "HIGH"),
    # Dynamic code loading
    "DexClassLoader":                   ("Dynamic DEX Loading", "HIGH"),
    # WebView injection
    "addJavascriptInterface":           ("WebView JS Interface (XSS Risk)", "HIGH"),
    "setWebContentsDebuggingEnabled":   ("WebView Remote Debugging Enabled", "HIGH"),
    # Accessibility (spyware)
    "AccessibilityService":             ("Accessibility Service (spyware risk)", "HIGH"),
    "onAccessibilityEvent":             ("Accessibility Event Hook", "HIGH"),
    # Device admin
    "DevicePolicyManager":              ("Device Admin API", "HIGH"),
    "lockNow":                          ("Device Lock Call", "HIGH"),
    # Surveillance
    "MediaRecorder":                    ("Audio/Video Recording", "HIGH"),
    "Camera.open":                      ("Camera Access", "HIGH"),
    # Location
    "getLastKnownLocation":             ("Location Tracking", "HIGH"),
    "requestLocationUpdates":           ("Continuous Location Tracking", "HIGH"),
    # Clipboard
    "ClipboardManager":                 ("Clipboard Access", "HIGH"),

    # --- MEDIUM SIGNAL: worth sending, context-dependent ---
    # Crypto weaknesses
    "getInstance(\"MD5\")":             ("Weak Hash: MD5", "MEDIUM"),
    "getInstance(\"SHA-1\")":           ("Weak Hash: SHA-1", "MEDIUM"),
    "getInstance(\"DES\")":             ("Weak Cipher: DES", "MEDIUM"),
    "getInstance(\"RC4\")":             ("Weak Cipher: RC4", "MEDIUM"),
    "ECB":                              ("Insecure Cipher Mode: ECB", "MEDIUM"),
    "NoPadding":                        ("No Padding (insecure crypto)", "MEDIUM"),
    # WebView
    "setJavaScriptEnabled(true)":       ("WebView JS Enabled", "MEDIUM"),
    "loadUrl(\"http://":               ("WebView Cleartext Load", "MEDIUM"),
    # Root/emulator detection (evasion indicators)
    "su\"":                             ("Root Check (su binary)", "MEDIUM"),
    "RootBeer":                         ("Root Detection Library", "MEDIUM"),
    "isRooted":                         ("Root Detection", "MEDIUM"),
    "detect_emulator":                  ("Emulator Detection", "MEDIUM"),
    "Build.FINGERPRINT":                ("Emulator/Device Fingerprint Check", "MEDIUM"),
    # Dynamic class loading (lower than DexClassLoader)
    "PathClassLoader":                  ("Dynamic Class Loading", "MEDIUM"),
    # File operations
    "openFileOutput(":                  ("File Write", "MEDIUM"),
    "getExternalStorageDirectory":      ("External Storage Access", "MEDIUM"),
    # Cleartext network
    "URL(\"http://":                    ("Cleartext HTTP URL", "MEDIUM"),

    # --- LOW SIGNAL: counted only, not individually listed to LLM ---
    # These are ubiquitous in legitimate apps and only matter in aggregate
    "HttpURLConnection":                ("HTTP Network Connection", "LOW"),
    "OkHttpClient":                     ("HTTP Network Connection", "LOW"),
    "SharedPreferences":                ("SharedPreferences Usage", "LOW"),
    "getSharedPreferences":             ("SharedPreferences Access", "LOW"),
    "java.lang.reflect":                ("Java Reflection", "LOW"),
    "invoke(":                          ("Reflective Method Invocation", "LOW"),
}

# Patterns that should be SUPPRESSED when found inside standard library paths
LIBRARY_NOISE_PATTERNS = {
    "java.lang.reflect", "invoke(",
    "SharedPreferences", "getSharedPreferences",
    "HttpURLConnection", "OkHttpClient",
    "URL(\"http://",
}
LIBRARY_PATH_PREFIXES = (
    "android/support/", "androidx/", "com/google/",
    "com/squareup/", "okhttp3/", "okio/",
    "org/apache/", "kotlin/", "kotlinx/",
    "com/bumptech/", "retrofit2/", "dagger/",
    "io/reactivex/", "com/fasterxml/", "bolts/",
    "com/facebook/", "org/intellij/", "org/jetbrains/",
)

from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parent.parent

TOOL_PATHS = {
    'apktool': PROJECT_ROOT / 'tools' / 'apktool' / 'apktool.bat',
    'jadx': PROJECT_ROOT / 'tools' / 'jadx' / 'bin' / 'jadx.bat',
}

print(f"[INIT] PROJECT_ROOT = {PROJECT_ROOT}", flush=True)
for tool_name, tool_p in TOOL_PATHS.items():
    print(f"[INIT] {tool_name} -> {tool_p} (exists={tool_p.exists()})", flush=True)

# ---------- Tool helpers ----------
def get_tool_path(name):
    local_path = TOOL_PATHS.get(name)
    if local_path and local_path.exists():
        return str(local_path)
    return shutil.which(name)

def run_apktool(apk_path, out_dir):
    tool_path = get_tool_path('apktool')
    if not tool_path:
        return False, f"APKtool not found (checked {TOOL_PATHS['apktool']})"
    try:
        cmd = f'"{tool_path}" d -q -s -f "{apk_path}" -o "{out_dir}"'
        print(f"[run_apktool] CMD: {cmd}", flush=True)
        result = subprocess.run(cmd, capture_output=True, shell=True, timeout=120)
        stdout = result.stdout.decode(errors='replace')
        stderr = result.stderr.decode(errors='replace')
        print(f"[run_apktool] returncode={result.returncode}", flush=True)
        if result.returncode != 0:
            return False, f"APKtool error (rc={result.returncode}): {stderr or stdout}"
        return True, "APKtool extraction successful"
    except Exception as e:
        print(f"[run_apktool] EXCEPTION: {type(e).__name__}: {e}", flush=True)
        return False, f"APKtool exception: {e}"

def run_jadx(apk_path, out_dir):
    tool_path = get_tool_path('jadx')
    if not tool_path:
        return False, f"JADX not found (checked {TOOL_PATHS['jadx']})"
    try:
        cmd = f'"{tool_path}" -q -d "{out_dir}" "{apk_path}"'
        print(f"[run_jadx] CMD: {cmd}", flush=True)
        result = subprocess.run(cmd, capture_output=True, shell=True, timeout=120)
        stdout = result.stdout.decode(errors='replace')
        stderr = result.stderr.decode(errors='replace')
        print(f"[run_jadx] returncode={result.returncode}", flush=True)
        if result.returncode != 0:
            return False, f"JADX error (rc={result.returncode}): {stderr or stdout}"
        return True, "JADX decompilation successful"
    except Exception as e:
        print(f"[run_jadx] EXCEPTION: {type(e).__name__}: {e}", flush=True)
        return False, f"JADX exception: {e}"

def extract_api_calls_from_source(source_dir):
    """Scan decompiled Java source for suspicious API usage.
    Filters out noisy patterns from standard library paths.
    Tags each finding with is_library and signal_level (HIGH/MEDIUM/LOW)."""
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


import re

# Patterns that suggest hardcoded secrets in Java source
HARDCODED_SECRET_PATTERNS = [
    (re.compile(r'(?i)(password|passwd|pwd)\s*=\s*"([^"]{4,})"'),        "Hardcoded Password"),
    (re.compile(r'(?i)(api_?key|apikey|api_?secret)\s*=\s*"([^"]{6,})"'),"Hardcoded API Key"),
    (re.compile(r'(?i)(secret|token)\s*=\s*"([^"]{6,})"'),               "Hardcoded Secret/Token"),
    (re.compile(r'(?i)(username|user_name|uname)\s*=\s*"([^"]{3,})"'),   "Hardcoded Username"),
    (re.compile(r'(?i)(private_?key|privatekey)\s*=\s*"([^"]{8,})"'),    "Hardcoded Private Key"),
    (re.compile(r'(?i)(master.?password|admin.?pass|dev.?pass)\s*=\s*"([^"]{3,})"'), "Developer/Master Password"),
    (re.compile(r'(?i)\.equals\s*\(\s*"(admin|developer|test|debug|root|password|default|master|1234|letmein|qwerty|changeme)"'), "Backdoor Credential Check"),
    (re.compile(r'"http://\d+\.\d+\.\d+\.\d+'),                         "Hardcoded IP Address URL"),
    (re.compile(r'(?i)(db_?password|database_?pass|mysql_?pass)\s*=\s*"([^"]{3,})"'), "Hardcoded Database Password"),
]

def scan_hardcoded_secrets(source_dir):
    """Scan decompiled Java source for hardcoded secrets using regex."""
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
                                # Redact the actual secret value in output
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
    """
    Use Androguard's parsed APK object to extract manifest-level
    vulnerability indicators. Returns a structured dict.
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
    Only collects snippets for app code (not libraries) and HIGH/MEDIUM signal APIs."""
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

# ---------- Evidence Pipeline (Phase 1) ----------

def parse_frida_logs(raw_logs):
    """Parse raw Frida log strings into structured typed events.
    This makes dynamic evidence machine-readable instead of dumping raw strings."""
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


def build_static_evidence(package_name, permissions, high_risk, api_calls,
                          code_snippets, manifest_snippet, manifest_vulns,
                          hardcoded_secrets):
    """Build the static-only evidence bundle. No runtime claims allowed.
    This is what static agents (Permission, Code, Network, Threat Intel) receive.
    
    Only HIGH and MEDIUM signal findings are individually listed.
    LOW signal findings are collapsed into a count to avoid LLM noise."""

    # Separate app-code findings from library findings
    app_apis = [a for a in api_calls if not a.get('is_library', False)]
    lib_apis = [a for a in api_calls if a.get('is_library', False)]

    # Split app APIs by signal level
    high_apis = [a for a in app_apis if a.get('signal') == 'HIGH']
    medium_apis = [a for a in app_apis if a.get('signal') == 'MEDIUM']
    low_apis = [a for a in app_apis if a.get('signal') == 'LOW']

    evidence = f"""## Static Analysis Evidence — {package_name}

**EVIDENCE TYPE**: Static analysis only. This application has NOT been executed.
All findings represent CODE CAPABILITIES, not observed behavior.

### Permissions ({len(permissions)} total, {len(high_risk)} high-risk)
{chr(10).join(f'- {p}' for p in permissions) if permissions else '- None declared'}

### High-Risk Permissions
{chr(10).join(f'- {p}' for p in high_risk) if high_risk else '- None'}

### HIGH Signal API Findings ({len(high_apis)} found)
{chr(10).join(f'- [{a["description"]}] {a["api"]} in {a["file"]}' for a in high_apis) if high_apis else '- None'}

### MEDIUM Signal API Findings ({len(medium_apis)} found)
{chr(10).join(f'- [{a["description"]}] {a["api"]} in {a["file"]}' for a in medium_apis) if medium_apis else '- None'}

### Low Signal (not individually listed): {len(low_apis)} findings (e.g. SharedPreferences, HttpURLConnection, Reflection — common in legitimate apps)
### Library Code: {len(lib_apis)} findings (de-prioritized — from standard libraries)

### Manifest Vulnerabilities ({len(manifest_vulns or [])} found)
{chr(10).join(f'- [{v["severity"]}] {v["title"]}: {v["detail"]}' for v in (manifest_vulns or [])) if manifest_vulns else '- None detected'}

### Hardcoded Secrets / Backdoor Patterns ({len(hardcoded_secrets or [])} found)
{chr(10).join(f'- {s["type"]} in {s["file"]} (line {s["line"]}): {s["snippet"]}' for s in (hardcoded_secrets or [])) if hardcoded_secrets else '- None detected'}
"""

    if code_snippets:
        # Only include snippets for HIGH/MEDIUM signal APIs
        high_medium_patterns = {a['api'] for a in high_apis + medium_apis}
        relevant_snippets = [s for s in code_snippets if s['api'] in high_medium_patterns]
        if relevant_snippets:
            evidence += "\n### Code Snippets (context around high/medium signal API calls)\n"
            for s in relevant_snippets:
                evidence += f"\n--- {s['file']} (line {s['line']}, API: {s['api']}) ---\n```java\n{s['code']}\n```\n"

    if manifest_snippet:
        evidence += f"\n### AndroidManifest.xml (excerpt)\n```xml\n{manifest_snippet}\n```\n"

    return evidence


def build_dynamic_evidence(dynamic_logs, sandbox_status, duration_seconds=10):
    """Build the runtime-only evidence bundle. No static findings included.
    This is what the Behavior Agent receives."""

    parsed_events = parse_frida_logs(dynamic_logs) if dynamic_logs else []

    if not sandbox_status or not sandbox_status.get('success', False):
        return None, parsed_events  # No dynamic analysis performed

    # Group events by type
    event_groups = {}
    for evt in parsed_events:
        etype = evt['event_type']
        if etype not in event_groups:
            event_groups[etype] = []
        event_groups[etype].append(evt)

    evidence = f"""## Runtime Analysis Evidence

**EVIDENCE TYPE**: Dynamic runtime observations from sandbox execution.
**Observation Window**: {duration_seconds} seconds
**Total Events Captured**: {len(parsed_events)}
**Hooks Status**: Frida hooks were active for: Runtime.exec, SmsManager, Cipher, Base64.decode, URL creation, File access

"""

    if not parsed_events:
        evidence += """### No Runtime Activity Observed
The application was executed in the sandbox with Frida hooks active.
No monitored behaviors were triggered during the observation window.
This means the hooks did NOT intercept any calls — it does NOT mean the app lacks these capabilities.
"""
    else:
        for etype, events in event_groups.items():
            evidence += f"### {etype.replace('_', ' ').title()} ({len(events)} events)\n"
            for evt in events[:10]:  # Cap per category
                evidence += f"- [{evt['timestamp']}] {evt['detail']}\n"
            if len(events) > 10:
                evidence += f"  (... {len(events) - 10} more events omitted)\n"
            evidence += "\n"

    return evidence, parsed_events


# ---------- LLM Analysis Functions ----------

def log_llm_prompt(agent_name, messages):
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

def _repair_truncated_json(raw):
    """Attempt to repair truncated JSON from an LLM that ran out of tokens.
    Closes unclosed strings, arrays, and objects."""
    # If the string ends mid-value, try to close it
    # Remove any trailing incomplete key-value pair
    # Work backwards to find the last complete value
    
    # Strategy: find the last valid comma or complete value,
    # then close all open brackets/braces
    
    # First, try to close any open string
    quote_count = 0
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
            quote_count += 1
    
    if in_string:
        # We're inside an unclosed string — close it
        raw = raw.rstrip()
        # Remove any trailing incomplete escape
        if raw.endswith('\\'):
            raw = raw[:-1]
        raw += '"'
    
    # Now try to find the last position where we can cut and close brackets
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


def _parse_llm_json(raw):
    """Parse JSON from LLM response, handling common issues:
    - Empty responses
    - Markdown fences (```json ... ```)
    - Preamble text before the JSON
    - Trailing text after the JSON
    - Truncated responses (DeepSeek flash running out of tokens)
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
    # Find the last complete property by looking for the last "}," or "],"
    for trim_marker in ['},', '],', '"}\n', '"]\n']:
        last_pos = raw.rfind(trim_marker)
        if last_pos > 0:
            candidate = raw[:last_pos + len(trim_marker) - 1]  # include } or ] but not ,
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
    Replaces them with evidence-based alternatives where possible."""
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
    """Apply language enforcement to all string values in agent findings."""
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


def run_static_agents(package_name, permissions, high_risk, api_calls, code_snippets,
                      manifest_snippet="", manifest_vulns=None, hardcoded_secrets=None):
    """Run static analysis agents: Permission, Code, Network, Threat Intel.
    These agents receive ONLY static evidence — no runtime data."""
    if not llm_client:
        return None

    # Build the static-only evidence bundle
    static_evidence = build_static_evidence(
        package_name, permissions, high_risk, api_calls,
        code_snippets, manifest_snippet, manifest_vulns, hardcoded_secrets
    )

    system_prompt = """You are ARGUS, an Android security analysis system with 4 specialized static analysis agents.
You are analyzing STATIC evidence ONLY. This application has NOT been executed.

ABSOLUTE RULES — VIOLATION OF THESE RULES IS UNACCEPTABLE:
1. Every finding MUST use "capability detected" / "code exists for" / "permission declared"
   NEVER use "performs" / "executes" / "sends" / "connects" / "exfiltrates"
2. FORBIDDEN phrases (do NOT use under any circumstances):
   may, might, could, potentially, likely, possibly, suggests that, indicates that,
   appears to, seems to, aligns with, consistent with malware, characteristic of,
   typical of malware, exfiltrate, command and control, privilege escalation, data theft
3. Findings tagged [LIBRARY] are from standard libraries (androidx, com.google, etc.)
   — mark them LOW confidence and do NOT treat them as application-specific behavior
4. Every claim MUST cite the source file name
5. Do NOT infer intent from capability. "SmsManager in code" means "SMS capability exists"
   — it does NOT mean "app sends SMS" or "app is spyware"
6. Manifest misconfigurations (debuggable, allowBackup) are CONFIGURATION VULNERABILITIES,
   not evidence of malicious intent

CONFIDENCE SCORING (use for each finding):
- HIGH: Direct code evidence with clear malicious context (e.g., hardcoded backdoor credential,
  obfuscated C2 URL, plaintext password in login function)
- MEDIUM: Code evidence exists but context is ambiguous or could be legitimate
  (e.g., Runtime.exec with variable argument, DexClassLoader for plugin system)
- LOW: Pattern exists but is extremely common in legitimate apps
  (e.g., SharedPreferences, HttpURLConnection, Log.d)

You MUST respond with valid JSON only (no markdown fences, no extra text). Use this exact schema:
{
  "perm": {
    "findings": [
      {
        "evidence": "exact permission string or API",
        "source_file": "filename where found",
        "interpretation": "factual capability statement — no speculation",
        "confidence": "HIGH|MEDIUM|LOW",
        "runtime_validation": "NOT_TESTED"
      }
    ],
    "summary": "one-line factual summary"
  },
  "code": {
    "findings": [
      {
        "evidence": "exact API or code pattern",
        "source_file": "filename",
        "interpretation": "what this code is capable of — stated as capability, not behavior",
        "confidence": "HIGH|MEDIUM|LOW",
        "runtime_validation": "NOT_TESTED"
      }
    ],
    "summary": "one-line factual summary"
  },
  "network": {
    "findings": [
      {
        "evidence": "network-related API or URL",
        "source_file": "filename",
        "interpretation": "network capability description",
        "confidence": "HIGH|MEDIUM|LOW",
        "runtime_validation": "NOT_TESTED"
      }
    ],
    "summary": "one-line factual summary"
  },
  "threat": {
    "findings": [
      {
        "evidence": "specific finding that maps to a threat pattern",
        "mitre_technique": "T1234 or N/A",
        "interpretation": "how this maps to the technique — capability only, not observed",
        "confidence": "HIGH|MEDIUM|LOW"
      }
    ],
    "summary": "one-line factual summary"
  }
}

Limit to the top 3 most significant findings per agent. Prioritize application code over library code.
Keep each "interpretation" field under 15 words."""

    max_attempts = 2
    for attempt in range(1, max_attempts + 1):
        try:
            print(f"[LLM] Sending static agents request (attempt {attempt}/{max_attempts})...", flush=True)
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": static_evidence},
            ]
            if attempt == 1:
                log_llm_prompt("Static Agents", messages)
            response = llm_client.chat.completions.create(
                model="deepseek-v4-flash",
                messages=messages,
                temperature=0.2 + (attempt - 1) * 0.1,  # slightly higher temp on retry
                max_tokens=4096,
            )
            raw = response.choices[0].message.content.strip()
            print(f"[LLM] Static agents received ({len(raw)} chars)", flush=True)

            findings = _parse_llm_json(raw)
            findings = enforce_language_on_findings(findings)
            return findings
        except json.JSONDecodeError as e:
            print(f"[LLM] Static agents JSON parse error (attempt {attempt}): {e}\nRaw: {raw[:500]}", flush=True)
            if attempt == max_attempts:
                return None
        except Exception as e:
            print(f"[LLM] Static agents error (attempt {attempt}): {type(e).__name__}: {e}", flush=True)
            if attempt == max_attempts:
                return None


def run_behavior_agent(dynamic_logs, sandbox_status, duration_seconds=10):
    """Run the Behavior Agent with ONLY dynamic/runtime evidence.
    This agent has NO access to static findings — it analyzes what was OBSERVED."""
    if not llm_client:
        return None

    dynamic_evidence, parsed_events = build_dynamic_evidence(
        dynamic_logs, sandbox_status, duration_seconds
    )

    # If no dynamic analysis was performed, return a structured "not performed" result
    if dynamic_evidence is None:
        return {
            "behavior": {
                "observed_events": [],
                "observation_window_seconds": 0,
                "hooks_triggered": 0,
                "hooks_silent": 6,
                "summary": "Dynamic analysis was not performed. No emulator was available.",
                "findings": []
            }
        }

    system_prompt = """You are the ARGUS Behavior Agent. You analyze ONLY runtime observations.

YOUR EVIDENCE: Frida hook intercepts that captured ACTUAL function calls during sandbox execution.
These are OBSERVED behaviors — things that actually happened when the app ran.

ABSOLUTE RULES — VIOLATION OF THESE RULES IS UNACCEPTABLE:
1. You MUST ONLY discuss what was OBSERVED at runtime (Frida hook intercepts)
2. You have NO access to static analysis. Do NOT reference source code, permissions, or manifest.
3. If a Frida hook triggered, report it as OBSERVED FACT: "Runtime.exec('su') was called"
4. If zero hooks triggered, your entire report is:
   "Application was executed for N seconds. No monitored behaviors were triggered."
5. "No SMS observed" does NOT mean "App does not send SMS" — it means
   "No SMS activity was captured during the observation window"
6. FORBIDDEN: inferring capability from non-observation, referencing static analysis,
   using words: may, might, could, potentially, likely, possibly

CONFIDENCE for runtime findings is always HIGH — you saw it happen.

You MUST respond with valid JSON only (no markdown fences, no extra text):
{
  "behavior": {
    "observed_events": [
      {
        "event_type": "command_execution|network|crypto|sms|file_access|base64",
        "evidence": "exact Frida log entry showing what was observed",
        "timestamp": "when it was observed",
        "interpretation": "factual description of what happened — this is OBSERVED, not inferred"
      }
    ],
    "observation_window_seconds": N,
    "hooks_triggered": N,
    "hooks_silent": N,
    "summary": "one-line factual summary of what was observed at runtime",
    "findings": [
      {
        "evidence": "specific runtime observation",
        "source_file": "runtime",
        "interpretation": "what was observed",
        "confidence": "HIGH",
        "runtime_validation": "OBSERVED"
      }
    ]
  }
}"""

    try:
        print("[LLM] Sending behavior agent request (dynamic only)...", flush=True)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": dynamic_evidence},
        ]
        log_llm_prompt("Behavior Agent", messages)
        response = llm_client.chat.completions.create(
            model="deepseek-v4-flash",
            messages=messages,
            temperature=0.1,
            max_tokens=1500,
        )
        raw = response.choices[0].message.content.strip()
        print(f"[LLM] Behavior agent received ({len(raw)} chars)", flush=True)

        findings = _parse_llm_json(raw)
        findings = enforce_language_on_findings(findings)
        return findings
    except json.JSONDecodeError as e:
        print(f"[LLM] Behavior agent JSON parse error: {e}\nRaw: {raw[:500]}", flush=True)
        return None
    except Exception as e:
        print(f"[LLM] Behavior agent error: {type(e).__name__}: {e}", flush=True)
        return None

# ---------- Correlation Engine (Phase 3 — deterministic, no LLM) ----------

# Maps static API pattern descriptions to Frida event types for correlation
STATIC_TO_DYNAMIC_MAP = {
    # Static description → dynamic event_type
    "OS Command Execution": "command_execution",
    "Process Spawning": "command_execution",
    "SMS Operations": "sms",
    "SMS Sending": "sms",
    "HTTP Network Connection": "network",
    "Cleartext HTTP URL": "network",
    "WebView Cleartext Load": "network",
    "Weak Hash: MD5": "crypto",
    "Weak Hash: SHA-1": "crypto",
    "Weak Cipher: DES": "crypto",
    "Weak Cipher: RC4": "crypto",
    "Insecure Cipher Mode: ECB": "crypto",
    "Dynamic DEX Loading": "file_access",
    "Dynamic Class Loading": "file_access",
    "File Write": "file_access",
    "External Storage Access": "file_access",
}


def build_correlation_matrix(api_calls, dynamic_logs, sandbox_status):
    """Deterministically correlate static API findings with dynamic Frida observations.
    No LLM needed — this is pure pattern matching.

    Returns a list of correlation entries showing which static capabilities
    were validated (or not) by runtime evidence."""

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
            # Dynamic analysis wasn't performed
            correlations.append({
                "capability": desc,
                "static_evidence": static_evidence,
                "dynamic_evidence": "Dynamic analysis was not performed",
                "status": "NOT_TESTED",
                "risk_assessment": f"Static capability detected. Runtime validation required.",
            })
        elif expected_event_type in dynamic_by_type:
            # Found matching dynamic events — VALIDATED
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
            # Dynamic ran but this capability was NOT observed
            correlations.append({
                "capability": desc,
                "static_evidence": static_evidence,
                "dynamic_evidence": f"No {expected_event_type} activity observed in {len(parsed_events)} total events",
                "status": "NOT_VALIDATED",
                "risk_assessment": f"Code exists but was not triggered during {len(parsed_events)}-event observation window.",
            })

    # Count validation stats
    validated_count = sum(1 for c in correlations if c['status'] == 'VALIDATED')
    not_validated_count = sum(1 for c in correlations if c['status'] == 'NOT_VALIDATED')
    not_tested_count = sum(1 for c in correlations if c['status'] == 'NOT_TESTED')

    print(f"[Correlation] {len(correlations)} entries: "
          f"{validated_count} validated, {not_validated_count} not validated, "
          f"{not_tested_count} not tested", flush=True)

    return correlations



def run_consensus(agent_findings, package_name, high_risk, api_calls, score,
                   dynamic_ran=False, correlation_matrix=None):
    """Generate final verdict, confidence, executive summary, and recommendations.
    Uses correlation matrix to drive evidence-based verdict decisions."""
    if not llm_client or not agent_findings:
        return None

    correlation_matrix = correlation_matrix or []

    # Build structured agent summary (not just detail dumps)
    agent_summaries = ""
    for agent_id, agent_data in agent_findings.items():
        summary = agent_data.get('summary', 'N/A')
        findings = agent_data.get('findings', [])
        agent_summaries += f"\n### {agent_id.title()} Agent\n"
        agent_summaries += f"Summary: {summary}\n"
        if findings:
            for f in findings[:3]:
                evidence = f.get('evidence', '')
                interp = f.get('interpretation', '')
                conf = f.get('confidence', '')
                validation = f.get('runtime_validation', 'NOT_TESTED')
                agent_summaries += f"- [{conf}] {evidence}: {interp} (Runtime: {validation})\n"

    # Build correlation summary
    validated = [c for c in correlation_matrix if c['status'] == 'VALIDATED']
    not_validated = [c for c in correlation_matrix if c['status'] == 'NOT_VALIDATED']
    not_tested = [c for c in correlation_matrix if c['status'] == 'NOT_TESTED']

    correlation_summary = f"""
### Correlation Analysis
- **Validated** (static capability confirmed at runtime): {len(validated)}
- **Not Validated** (code exists, not observed at runtime): {len(not_validated)}
- **Not Tested** (no dynamic analysis performed): {len(not_tested)}
"""
    if validated:
        correlation_summary += "\nValidated capabilities:\n"
        for c in validated:
            correlation_summary += f"- {c['capability']}: Static={c['static_evidence']} → Runtime={c['dynamic_evidence']}\n"
    if not_validated:
        correlation_summary += "\nNot validated (code exists, not triggered):\n"
        for c in not_validated:
            correlation_summary += f"- {c['capability']}: {c['static_evidence']} — {c['dynamic_evidence']}\n"

    has_dynamic = dynamic_ran
    analysis_scope = "Static + Dynamic analysis" if has_dynamic else "Static analysis ONLY (no runtime/dynamic analysis was performed)"

    system_prompt = f"""You are the ARGUS Consensus Engine. Produce a final verdict based on agent findings and the correlation matrix.

ANALYSIS SCOPE: {analysis_scope}

CORRELATION DATA DRIVES YOUR VERDICT:
- VALIDATED correlations = highest weight (static capability was confirmed at runtime)
- NOT_VALIDATED = the code exists but was not triggered during testing — this is NOT evidence of absence
- NOT_TESTED = dynamic analysis was not performed — you cannot confirm or deny runtime behavior

VERDICT RULES (STRICT):
- "malicious": REQUIRES ≥2 VALIDATED dangerous behaviors (e.g., SMS actually sent + data actually exfiltrated). Static-only analysis CANNOT produce "malicious".
- "high-risk": ≥1 VALIDATED dangerous behavior, OR strong static indicators (hardcoded backdoor credentials, obfuscated C2 URLs) even without validation. This is the MAX for static-only with strong evidence.
- "suspicious": Dangerous capabilities exist in code but none were validated at runtime, OR static-only analysis with concerning patterns.
- "benign": No significant static or dynamic findings.

CONFIDENCE FORMULA (follow this exactly):
- Base: 50%
- +10% per VALIDATED correlation
- +5% per HIGH-confidence static finding (from agent findings)
- +3% per MEDIUM-confidence static finding
- -10% if analysis was static-only (no dynamic phase)
- -15% if package name contains "test", "demo", "sample", "insecure", "vulnerable", "training"
- Cap at 95% maximum (never claim certainty)
- Show your calculation in a "confidence_breakdown" field

EXECUTIVE SUMMARY RULES:
- First sentence: what analysis was performed
- State specific findings as capabilities or observations (depending on evidence type)
- NEVER use: may, might, could, potentially, likely, possibly, suggests, indicates
- Final sentence: state limitations clearly

ANALYST SUMMARY RULES:
- Provide a brief summary of the findings and what stood out.
- Mention all the normal stuff a person would need to know when analyzing the apk.
- Keep it direct and focused on key takeaways for a human analyst.

You MUST respond with valid JSON only (no markdown fences, no extra text):
{{
  "verdict": "suspicious",
  "confidence": 80,
  "confidence_breakdown": "Base 50 + 30 = 80",
  "executive_summary": "3-5 sentence evidence-based summary.",
  "analyst_summary": "Brief summary of what stood out and key analyst takeaways.",
  "recommended_actions": "2-3 specific recommended actions.",
  "mitre_techniques": ["T1234: Technique Name"]
}}"""

    user_msg = f"""## Consensus Input for {package_name}

{agent_summaries}

{correlation_summary}

**Rule-based risk score**: {score}%
**High-risk permissions**: {len(high_risk)}
**HIGH signal API findings (app code)**: {len([a for a in api_calls if not a.get('is_library', False) and a.get('signal') == 'HIGH'])}
**MEDIUM signal API findings (app code)**: {len([a for a in api_calls if not a.get('is_library', False) and a.get('signal') == 'MEDIUM'])}
**LOW signal API findings (noise, not listed)**: {len([a for a in api_calls if not a.get('is_library', False) and a.get('signal') == 'LOW'])}"""

    max_attempts = 2
    for attempt in range(1, max_attempts + 1):
        try:
            print(f"[LLM] Sending consensus request (attempt {attempt}/{max_attempts})...", flush=True)
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg},
            ]
            if attempt == 1:
                log_llm_prompt("Consensus Agent", messages)
            response = llm_client.chat.completions.create(
                model="deepseek-v4-flash",
                messages=messages,
                temperature=0.2 + (attempt - 1) * 0.1,
                max_tokens=2000,
            )
            raw = response.choices[0].message.content.strip()
            print(f"[LLM] Consensus received ({len(raw)} chars)", flush=True)

            consensus = _parse_llm_json(raw)
            # Apply language enforcement to consensus output too
            consensus = enforce_language_on_findings(consensus)
            return consensus
        except json.JSONDecodeError as e:
            print(f"[LLM] Consensus JSON parse error (attempt {attempt}): {e}\nRaw: {raw[:500]}", flush=True)
            if attempt == max_attempts:
                return None
        except Exception as e:
            print(f"[LLM] Consensus error (attempt {attempt}): {type(e).__name__}: {e}", flush=True)
            if attempt == max_attempts:
                return None


# ---------- Routes ----------

@app.route('/analyze', methods=['POST'])
def analyze_apk():
    print(f"\n{'='*60}", flush=True)
    print(f"[analyze_apk] REQUEST RECEIVED", flush=True)
    if 'file' not in request.files:
        return jsonify({'error': 'no file provided'}), 400
    f = request.files['file']
    print(f"[analyze_apk] filename={f.filename}", flush=True)
    if f.filename == '':
        return jsonify({'error': 'empty filename'}), 400

    tmp_fd, tmp_path = tempfile.mkstemp(suffix='.apk')
    os.close(tmp_fd)
    apktool_out = tempfile.mkdtemp(prefix='apktool_')
    jadx_out = tempfile.mkdtemp(prefix='jadx_')

    try:
        f.save(tmp_path)

        # 1. Androguard Permissions
        apk = APK(tmp_path)
        package_name = apk.get_package() or "unknown"
        permissions = list(apk.get_permissions() or [])
        used_high_risk = [p for p in permissions if p in HIGH_RISK_PERMISSIONS]

        # 2. APKtool extraction
        apktool_success, apktool_msg = run_apktool(tmp_path, apktool_out)

        # 3. JADX decompilation
        jadx_success, jadx_msg = run_jadx(tmp_path, jadx_out)

        # 4. API call extraction
        api_calls = []
        if jadx_success:
            api_calls = extract_api_calls_from_source(jadx_out)

        # 5. Manifest vulnerability analysis (via Androguard)
        manifest_vulns = analyze_manifest_vulnerabilities(apk)
        print(f"[analyze_apk] manifest_vulns found: {len(manifest_vulns)}", flush=True)

        # 6. Collect code snippets for LLM context
        code_snippets = []
        if jadx_success:
            code_snippets = collect_code_snippets(jadx_out, api_calls)

        # 7. Hardcoded secrets scan (via regex on JADX output)
        hardcoded_secrets = []
        if jadx_success:
            hardcoded_secrets = scan_hardcoded_secrets(jadx_out)
        print(f"[analyze_apk] hardcoded_secrets found: {len(hardcoded_secrets)}", flush=True)

        # 8. Read raw manifest for LLM context (APKtool output)
        manifest_snippet = ""
        manifest_path = os.path.join(apktool_out, "AndroidManifest.xml")
        if apktool_success and os.path.exists(manifest_path):
            try:
                with open(manifest_path, 'r', encoding='utf-8', errors='ignore') as mf:
                    manifest_snippet = mf.read()[:3000]  # cap at 3KB
            except Exception:
                pass

        # 7. Dynamic Analysis (Phase 2)
        dynamic_logs = None
        sandbox = SandboxOrchestrator()
        sandbox_status = {'success': False, 'message': 'No emulator connected'}
        if sandbox.check_emulator():
            # Run sandbox for 10 seconds to gather quick behavioral intel
            print("[analyze_apk] Sandbox starting...", flush=True)
            sandbox_res = sandbox.run_dynamic_analysis(package_name, tmp_path, duration_seconds=10)
            sandbox_status['success'] = sandbox_res['success']
            sandbox_status['message'] = 'Sandbox execution complete' if sandbox_res['success'] else sandbox_res.get('error', 'Failed')
            dynamic_logs = sandbox_res.get('logs', [])
            print(f"[analyze_apk] Sandbox collected {len(dynamic_logs)} logs.", flush=True)

        # 9. Rule-based score — per-finding weighted (not flat count)
        # Each API pattern has a specific point value based on actual threat severity.
        # LOW signal APIs (SharedPreferences, HttpURLConnection, etc.) score 0.
        API_SCORE_WEIGHTS = {
            # CRITICAL — 25 points each (genuine malware indicators)
            "Runtime.getRuntime().exec": 25,
            "ProcessBuilder": 25,
            "SmsManager": 25,
            "sendTextMessage": 25,
            "DexClassLoader": 25,
            "AccessibilityService": 25,
            "onAccessibilityEvent": 25,
            "DevicePolicyManager": 25,
            "getSubscriberId": 20,
            "getDeviceId": 20,
            "getLine1Number": 20,
            "MediaRecorder": 20,
            "Camera.open": 20,
            "lockNow": 20,
            # HIGH — 15 points each
            "getLastKnownLocation": 15,
            "requestLocationUpdates": 15,
            "ClipboardManager": 15,
            "addJavascriptInterface": 15,
            "setWebContentsDebuggingEnabled": 15,
            # MEDIUM — 10 points each
            "setJavaScriptEnabled(true)": 10,
            "loadUrl(\"http://": 10,
            "PathClassLoader": 10,
            "getExternalStorageDirectory": 10,
            "openFileOutput(": 5,
            "URL(\"http://": 5,
            # Crypto weaknesses — 5 points each
            "getInstance(\"MD5\")": 5,
            "getInstance(\"SHA-1\")": 5,
            "getInstance(\"DES\")": 5,
            "getInstance(\"RC4\")": 5,
            "ECB": 5,
            "NoPadding": 5,
            # Evasion indicators — 5 points each
            "su\"": 5,
            "RootBeer": 5,
            "isRooted": 5,
            "detect_emulator": 5,
            "Build.FINGERPRINT": 5,
        }

        score = 0
        # Permission contribution: proportional but capped at 15
        if permissions:
            score += min(15, (len(used_high_risk) / len(permissions)) * 15)

        # API contribution: per-finding weighted, app code only
        api_score = 0
        for a in api_calls:
            if a.get('is_library', False):
                continue
            api_score += API_SCORE_WEIGHTS.get(a['api'], 0)
        score += min(40, api_score)  # cap API contribution at 40

        # Manifest vulns: exported components and unprotected providers are serious
        for v in manifest_vulns:
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
        parsed_dynamic_events = [l for l in (dynamic_logs or []) if isinstance(l, str) and not l.startswith("Frida")]
        if parsed_dynamic_events:
            score += 15

        score = round(min(99, score), 2)

        # 10. LLM Static Analysis (Permission, Code, Network, Threat Intel agents)
        static_findings = run_static_agents(
            package_name, permissions, used_high_risk, api_calls, code_snippets,
            manifest_snippet, manifest_vulns, hardcoded_secrets
        )

        # 11. LLM Behavior Agent (dynamic evidence ONLY — separated from static)
        dynamic_ran = sandbox_status.get('success', False)
        behavior_findings = run_behavior_agent(
            dynamic_logs, sandbox_status, duration_seconds=10
        )

        # 12. Merge agent findings (static + behavior) for downstream consumption
        agent_findings = {}
        if static_findings:
            agent_findings.update(static_findings)
        if behavior_findings:
            agent_findings.update(behavior_findings)

        # Generate backward-compatible summary/detail for each agent
        # (the frontend currently expects {summary, detail} per agent)
        for agent_id in ['perm', 'code', 'network', 'threat', 'behavior']:
            if agent_id in agent_findings:
                agent_data = agent_findings[agent_id]
                # Ensure summary exists
                if 'summary' not in agent_data:
                    agent_data['summary'] = 'Analysis complete'
                # Build detail from findings if not present
                if 'detail' not in agent_data and 'findings' in agent_data:
                    details = []
                    for f in agent_data['findings'][:3]:
                        interp = f.get('interpretation', f.get('evidence', ''))
                        conf = f.get('confidence', '')
                        validation = f.get('runtime_validation', 'NOT_TESTED')
                        details.append(f"[{conf}] {interp} (Validation: {validation})")
                    agent_data['detail'] = ' '.join(details) if details else agent_data['summary']

        # 13. Build correlation matrix (deterministic — no LLM needed)
        correlation_matrix = build_correlation_matrix(api_calls, dynamic_logs, sandbox_status)

        # 14. LLM Consensus (now receives correlation data)
        consensus = run_consensus(
            agent_findings, package_name, used_high_risk, api_calls, score,
            dynamic_ran=dynamic_ran, correlation_matrix=correlation_matrix
        )

        # Build response
        analysis_scope = 'static_and_dynamic' if dynamic_ran else 'static_only'
        result = {
            'package': package_name,
            'permissions': permissions,
            'high_risk_permissions': used_high_risk,
            'api_calls': api_calls,
            'manifest_vulnerabilities': manifest_vulns,
            'hardcoded_secrets': hardcoded_secrets,
            'dynamic_logs': dynamic_logs,
            'correlations': correlation_matrix,
            'pipeline_status': {
                'apktool': {'success': apktool_success, 'message': apktool_msg},
                'jadx': {'success': jadx_success, 'message': jadx_msg},
                'sandbox': sandbox_status
            },
            'permission_score_percent': score,
            'analysis_scope': analysis_scope,
        }

        # Add LLM results if available
        if agent_findings:
            result['agent_findings'] = agent_findings
        if consensus:
            result['verdict'] = consensus.get('verdict', None)
            result['confidence'] = consensus.get('confidence', None)
            result['confidence_breakdown'] = consensus.get('confidence_breakdown', None)
            result['executive_summary'] = consensus.get('executive_summary', None)
            result['analyst_summary'] = consensus.get('analyst_summary', None)
            result['recommended_actions'] = consensus.get('recommended_actions', None)
            result['mitre_techniques'] = consensus.get('mitre_techniques', [])

        print(f"[analyze_apk] DONE - verdict={result.get('verdict', 'N/A')} scope={analysis_scope}", flush=True)
        return jsonify(result)
    except Exception as e:
        print(f"[analyze_apk] ERROR: {type(e).__name__}: {e}", flush=True)
        return jsonify({'error': str(e)}), 500
    finally:
        try:
            os.remove(tmp_path)
            shutil.rmtree(apktool_out, ignore_errors=True)
            shutil.rmtree(jadx_out, ignore_errors=True)
        except Exception:
            pass


@app.route('/chat', methods=['POST'])
def chat_followup():
    """Handle follow-up questions about a completed analysis using DeepSeek."""
    if not llm_client:
        return jsonify({'answer': 'LLM is not configured. Set DEEPSEEK_API_KEY in .env'}), 200

    data = request.get_json(silent=True) or {}
    question = data.get('question', '').strip()
    report_context = data.get('report_context', {})

    if not question:
        return jsonify({'error': 'No question provided'}), 400

    system_prompt = """You are ARGUS, an evidence-based Android APK security analysis assistant.
You have completed a multi-agent analysis and the user is asking follow-up questions.

RULES FOR ANSWERING:
1. Answer based ONLY on the analysis data provided. Do not speculate.
2. Distinguish between:
   - "Detected in code" (static capability) — the code exists but was not necessarily executed
   - "Observed at runtime" (dynamic observation) — Frida hooks actually intercepted this behavior
   - "Validated" (correlation) — a static capability was confirmed by runtime observation
3. If asked "does the app do X?", clarify whether X was observed at runtime or is merely a code capability.
4. NEVER use: may, might, could, potentially, likely, possibly, suggests, indicates
5. If the user asks about something not covered in the analysis, say "This was not analyzed" rather than guessing.
6. Be concise (2-4 sentences) and reference specific evidence."""

    # Build context from the report
    ctx_parts = [f"**Package**: {report_context.get('package', 'unknown')}"]
    scope = report_context.get('analysisScope', 'static_only')
    ctx_parts.append(f"**Analysis Scope**: {'Static + Dynamic' if scope == 'static_and_dynamic' else 'Static Only'}")
    if report_context.get('verdict'):
        ctx_parts.append(f"**Verdict**: {report_context['verdict']} ({report_context.get('confidence', '?')}% confidence)")
    if report_context.get('confidenceBreakdown'):
        ctx_parts.append(f"**Confidence Breakdown**: {report_context['confidenceBreakdown']}")
    if report_context.get('executiveSummary'):
        ctx_parts.append(f"**Executive Summary**: {report_context['executiveSummary']}")
    if report_context.get('highRisk'):
        ctx_parts.append(f"**High-Risk Permissions (capabilities)**: {', '.join(report_context['highRisk'])}")
    if report_context.get('apiCalls'):
        app_apis = [a for a in report_context['apiCalls'][:10] if not a.get('is_library')]
        if app_apis:
            apis = [f"{a['api']} in {a['file']}" for a in app_apis]
            ctx_parts.append(f"**App Code APIs (capabilities)**: {', '.join(apis)}")
    if report_context.get('correlations'):
        validated = [c for c in report_context['correlations'] if c.get('status') == 'VALIDATED']
        not_validated = [c for c in report_context['correlations'] if c.get('status') == 'NOT_VALIDATED']
        if validated:
            ctx_parts.append(f"**Validated (runtime confirmed)**: {', '.join(c['capability'] for c in validated)}")
        if not_validated:
            ctx_parts.append(f"**Not Validated (code exists, not observed)**: {', '.join(c['capability'] for c in not_validated)}")
    if report_context.get('mitreTechniques'):
        ctx_parts.append(f"**MITRE ATT&CK**: {', '.join(report_context['mitreTechniques'])}")
    if report_context.get('agentFindings'):
        for agent_id, finding in report_context['agentFindings'].items():
            summary = finding.get('summary', '')
            ctx_parts.append(f"**{agent_id.title()} Agent**: {summary}")
    if report_context.get('recommendedActions'):
        ctx_parts.append(f"**Recommended Actions**: {report_context['recommendedActions']}")

    context = "\n".join(ctx_parts)

    try:
        print(f"[chat] Question: {question[:100]}", flush=True)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"## Analysis Context\n{context}\n\n## User Question\n{question}"},
        ]
        log_llm_prompt("Chat Assistant", messages)
        response = llm_client.chat.completions.create(
            model="deepseek-v4-flash",
            messages=messages,
            temperature=0.3,
            max_tokens=500,
        )
        answer = response.choices[0].message.content.strip()
        # Apply language enforcement to chat answers too
        answer = enforce_language_rules(answer)
        print(f"[chat] Answer: {answer[:100]}...", flush=True)
        return jsonify({'answer': answer})
    except Exception as e:
        print(f"[chat] ERROR: {type(e).__name__}: {e}", flush=True)
        return jsonify({'answer': f'Sorry, I encountered an error: {e}'}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050)
