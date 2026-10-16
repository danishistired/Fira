import os
import tempfile
import subprocess
import shutil
import logging
import json
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
# ----------------------------------------------------------------
SUSPICIOUS_API_PATTERNS = {
    # Telephony / SMS
    "SmsManager":                      "SMS Operations",
    "sendTextMessage":                  "SMS Sending",
    "getSubscriberId":                  "IMSI Extraction",
    "getDeviceId":                      "IMEI/Device ID Extraction",
    "getLine1Number":                   "Phone Number Extraction",
    # Command execution
    "Runtime.getRuntime().exec":        "OS Command Execution",
    "ProcessBuilder":                   "Process Spawning",
    # Location
    "getLastKnownLocation":             "Location Tracking",
    "requestLocationUpdates":           "Continuous Location Tracking",
    # Surveillance
    "MediaRecorder":                    "Audio/Video Recording",
    "Camera.open":                      "Camera Access",
    # Dynamic code loading
    "DexClassLoader":                   "Dynamic DEX Loading",
    "PathClassLoader":                  "Dynamic Class Loading",
    "loadClass":                        "Dynamic Class Loading",
    # Network
    "HttpURLConnection":                "HTTP Network Connection",
    "OkHttpClient":                     "HTTP Network Connection",
    "URL(\"http://":                    "Cleartext HTTP URL",
    # WebView
    "setJavaScriptEnabled(true)":       "WebView JS Enabled",
    "addJavascriptInterface":           "WebView JS Interface (XSS Risk)",
    "loadUrl(\"http://":               "WebView Cleartext Load",
    "setWebContentsDebuggingEnabled":   "WebView Remote Debugging Enabled",
    # Crypto
    "MD5":                              "Weak Hash: MD5",
    "getInstance(\"MD5\")":             "Weak Hash: MD5",
    "getInstance(\"SHA-1\")":           "Weak Hash: SHA-1",
    "getInstance(\"DES\")":             "Weak Cipher: DES",
    "getInstance(\"RC4\")":             "Weak Cipher: RC4",
    "ECB":                              "Insecure Cipher Mode: ECB",
    "NoPadding":                        "No Padding (potential ECB/insecure crypto)",
    # Logging
    "Log.d(":                           "Debug Logging",
    "Log.i(":                           "Info Logging",
    "Log.e(":                           "Error Logging",
    "Log.v(":                           "Verbose Logging",
    "System.out.println":               "Console Print (potential info leak)",
    # Root detection / evasion
    "su\",":                            "Root Check (su binary)",
    "RootBeer":                         "Root Detection Library",
    "isRooted":                         "Root Detection",
    "detect_emulator":                  "Emulator Detection",
    "Build.FINGERPRINT":                "Emulator/Device Fingerprint Check",
    # Keystore / crypto storage
    "SharedPreferences":                "SharedPreferences (potential plaintext storage)",
    "getSharedPreferences":             "SharedPreferences Access",
    # Reflection / obfuscation
    "java.lang.reflect":                "Java Reflection (obfuscation risk)",
    "invoke(":                          "Reflective Method Invocation",
    # File operations
    "openFileOutput(":                  "File Write",
    "getExternalStorageDirectory":      "External Storage Access",
    # Clipboard
    "ClipboardManager":                 "Clipboard Access",
    # Accessibility
    "AccessibilityService":             "Accessibility Service (spyware risk)",
    "onAccessibilityEvent":             "Accessibility Event Hook",
    # Device admin
    "DevicePolicyManager":              "Device Admin API",
    "lockNow":                          "Device Lock Call",
}

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
    """Scan decompiled Java source for suspicious API usage."""
    found_apis = []
    if not os.path.exists(source_dir):
        return found_apis
    seen = set()
    for root, _, files in os.walk(source_dir):
        for f in files:
            if not f.endswith('.java'):
                continue
            file_path = os.path.join(root, f)
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as fp:
                    content = fp.read()
                    for pattern, desc in SUSPICIOUS_API_PATTERNS.items():
                        if pattern in content:
                            key = (pattern, f)
                            if key not in seen:
                                seen.add(key)
                                found_apis.append({"api": pattern, "description": desc, "file": f})
            except Exception:
                pass
    return found_apis


import re

# Patterns that suggest hardcoded secrets in Java source
HARDCODED_SECRET_PATTERNS = [
    (re.compile(r'(?i)(password|passwd|pwd)\s*=\s*"([^"]{4,})"'),       "Hardcoded Password"),
    (re.compile(r'(?i)(api_?key|apikey|api_?secret)\s*=\s*"([^"]{6,})"'),"Hardcoded API Key"),
    (re.compile(r'(?i)(secret|token)\s*=\s*"([^"]{6,})"'),              "Hardcoded Secret/Token"),
    (re.compile(r'(?i)(username|user_name|uname)\s*=\s*"([^"]{3,})"'),  "Hardcoded Username"),
    (re.compile(r'(?i)(private_?key|privatekey)\s*=\s*"([^"]{8,})"'),   "Hardcoded Private Key"),
    (re.compile(r'(?i)\.equals\s*\(\s*"(admin|developer|test|debug|root|password|1234|letmein)"'), "Backdoor Credential Check"),
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
    """Collect short code snippets around suspicious API calls for LLM context."""
    snippets = []
    if not os.path.exists(source_dir) or not api_calls:
        return snippets
    # Build a set of (api_pattern, filename) pairs to find
    targets = {(a['api'], a['file']) for a in api_calls[:max_snippets]}
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

# ---------- LLM Analysis Functions ----------

def run_llm_analysis(package_name, permissions, high_risk, api_calls, code_snippets,
                     manifest_snippet="", dynamic_logs=None, manifest_vulns=None, hardcoded_secrets=None):
    """Run a batched 6-agent analysis via DeepSeek. Returns per-agent findings."""
    if not llm_client:
        return None

    manifest_vulns = manifest_vulns or []
    hardcoded_secrets = hardcoded_secrets or []

    # Build the data context for the LLM
    data_context = f"""## APK Analysis Data

**Package**: {package_name}

**All Permissions** ({len(permissions)}):
{chr(10).join(f'- {p}' for p in permissions)}

**High-Risk Permissions** ({len(high_risk)}):
{chr(10).join(f'- {p}' for p in high_risk) if high_risk else '- None'}

**Suspicious API Calls** ({len(api_calls)}):
{chr(10).join(f'- {a["api"]} ({a["description"]}) in {a["file"]}' for a in api_calls) if api_calls else '- None detected'}

**Manifest Vulnerabilities** ({len(manifest_vulns)} found):
{chr(10).join(f'- [{v["severity"]}] {v["title"]}: {v["detail"]}' for v in manifest_vulns) if manifest_vulns else '- None detected'}

**Hardcoded Secrets / Backdoor Patterns** ({len(hardcoded_secrets)} found):
{chr(10).join(f'- {s["type"]} in {s["file"]} (line {s["line"]}): {s["snippet"]}' for s in hardcoded_secrets) if hardcoded_secrets else '- None detected'}
"""

    if code_snippets:
        data_context += "\n**Code Snippets Around Suspicious Calls**:\n"
        for s in code_snippets:
            data_context += f"\n--- {s['file']} (line {s['line']}, API: {s['api']}) ---\n```java\n{s['code']}\n```\n"

    if manifest_snippet:
        data_context += f"\n**AndroidManifest.xml (excerpt)**:\n```xml\n{manifest_snippet}\n```\n"

    if dynamic_logs:
        data_context += "\n**Dynamic Analysis Logs (Frida Intercepts at Runtime)**:\n"
        if len(dynamic_logs) > 0:
            for log in dynamic_logs[:20]: # Cap to 20 lines to save tokens
                data_context += f"- {log}\n"
        else:
            data_context += "- App was executed, but no suspicious behavior was intercepted by the hooks.\n"
    else:
        data_context += "\n**Dynamic Analysis Logs**: (Not performed - no sandbox available)\n"

    system_prompt = """You are ARGUS, an expert Android malware analysis system composed of 6 specialized agents.
Analyze the provided APK data and respond as each agent with specific, evidence-based findings.

You MUST respond with valid JSON only (no markdown fences, no extra text). Use this exact schema:
{
  "perm": {
    "summary": "one-line summary for the Permission Agent",
    "detail": "2-3 sentence analysis of the permission landscape and risks"
  },
  "code": {
    "summary": "one-line summary for the Code Agent",
    "detail": "2-3 sentence analysis of suspicious code patterns and API usage"
  },
  "behavior": {
    "summary": "one-line summary for the Behavior Agent",
    "detail": "2-3 sentence analysis of potential behavioral patterns inferred from code"
  },
  "network": {
    "summary": "one-line summary for the Network Agent",
    "detail": "2-3 sentence analysis of network-related capabilities and risks"
  },
  "threat": {
    "summary": "one-line summary for the Threat Intelligence Agent",
    "detail": "2-3 sentence analysis correlating findings with known threat patterns/MITRE ATT&CK"
  },
  "consensus": {
    "summary": "one-line summary for the Consensus Agent (e.g. 'Verdict: suspicious')",
    "detail": "2-3 sentence final synthesis"
  }
}

Be specific and reference actual findings from the data. Do not make up capabilities not evidenced in the data."""

    try:
        print("[LLM] Sending 6-agent analysis request...", flush=True)
        response = llm_client.chat.completions.create(
            model="deepseek-v4-flash",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": data_context},
            ],
            temperature=0.3,
            max_tokens=2000,
        )
        raw = response.choices[0].message.content.strip()
        print(f"[LLM] Agent analysis received ({len(raw)} chars)", flush=True)

        # Try to parse JSON (handle markdown fences if present)
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        agent_findings = json.loads(raw)
        return agent_findings
    except json.JSONDecodeError as e:
        print(f"[LLM] JSON parse error: {e}\nRaw response: {raw[:500]}", flush=True)
        return None
    except Exception as e:
        print(f"[LLM] Agent analysis error: {type(e).__name__}: {e}", flush=True)
        return None


def run_consensus(agent_findings, package_name, high_risk, api_calls, score):
    """Generate final verdict, confidence, executive summary, and recommendations."""
    if not llm_client or not agent_findings:
        return None

    agent_summaries = "\n".join(
        f"- **{k.title()} Agent**: {v.get('detail', v.get('summary', 'N/A'))}"
        for k, v in agent_findings.items()
    )

    system_prompt = """You are the ARGUS Consensus Engine. Given the findings from 6 specialized agents analyzing an Android APK, produce a final verdict.

You MUST respond with valid JSON only (no markdown fences, no extra text). Use this exact schema:
{
  "verdict": "benign" | "suspicious" | "malicious",
  "confidence": 0-100,
  "executive_summary": "A 3-5 sentence executive summary of the analysis findings and conclusion.",
  "recommended_actions": "2-3 specific recommended actions based on the verdict.",
  "mitre_techniques": ["T1234: Technique Name", ...]
}

Base confidence on the strength and consistency of evidence. Be precise."""

    user_msg = f"""## Agent Findings for {package_name}

{agent_summaries}

**Rule-based risk score**: {score}%
**High-risk permissions**: {len(high_risk)}
**Suspicious API calls**: {len(api_calls)}"""

    try:
        print("[LLM] Sending consensus request...", flush=True)
        response = llm_client.chat.completions.create(
            model="deepseek-v4-flash",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.2,
            max_tokens=1000,
        )
        raw = response.choices[0].message.content.strip()
        print(f"[LLM] Consensus received ({len(raw)} chars)", flush=True)

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        consensus = json.loads(raw)
        return consensus
    except json.JSONDecodeError as e:
        print(f"[LLM] Consensus JSON parse error: {e}\nRaw: {raw[:500]}", flush=True)
        return None
    except Exception as e:
        print(f"[LLM] Consensus error: {type(e).__name__}: {e}", flush=True)
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

        # 9. Rule-based score (kept as baseline)
        score = 0
        if permissions:
            score += (len(used_high_risk) / len(permissions)) * 50
        if api_calls:
            score += min(30, len(api_calls) * 3)
        # Manifest vulns add directly to score
        high_manifest_vulns = [v for v in manifest_vulns if v.get('severity') == 'HIGH']
        score += min(15, len(high_manifest_vulns) * 5)
        if hardcoded_secrets:
            score += min(10, len(hardcoded_secrets) * 5)
        if dynamic_logs and len(dynamic_logs) > 0:
            score = min(99, score + 15)
        score = round(min(99, score), 2)

        # 10. LLM Analysis
        agent_findings = run_llm_analysis(
            package_name, permissions, used_high_risk, api_calls, code_snippets,
            manifest_snippet, dynamic_logs, manifest_vulns, hardcoded_secrets
        )

        # 11. LLM Consensus
        consensus = run_consensus(agent_findings, package_name, used_high_risk, api_calls, score)

        # Build response
        result = {
            'package': package_name,
            'permissions': permissions,
            'high_risk_permissions': used_high_risk,
            'api_calls': api_calls,
            'manifest_vulnerabilities': manifest_vulns,
            'hardcoded_secrets': hardcoded_secrets,
            'dynamic_logs': dynamic_logs,
            'pipeline_status': {
                'apktool': {'success': apktool_success, 'message': apktool_msg},
                'jadx': {'success': jadx_success, 'message': jadx_msg},
                'sandbox': sandbox_status
            },
            'permission_score_percent': score,
        }

        # Add LLM results if available
        if agent_findings:
            result['agent_findings'] = agent_findings
        if consensus:
            result['verdict'] = consensus.get('verdict', None)
            result['confidence'] = consensus.get('confidence', None)
            result['executive_summary'] = consensus.get('executive_summary', None)
            result['recommended_actions'] = consensus.get('recommended_actions', None)
            result['mitre_techniques'] = consensus.get('mitre_techniques', [])

        print(f"[analyze_apk] DONE - verdict={result.get('verdict', 'N/A')}", flush=True)
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

    system_prompt = """You are ARGUS, an Android APK security analysis assistant.
You have just completed a multi-agent analysis of an APK and the user is asking follow-up questions.
Answer based ONLY on the analysis data provided. Be specific, reference actual findings, and be concise (2-4 sentences).
If asked about something not covered in the analysis, say so honestly."""

    # Build context from the report
    ctx_parts = [f"**Package**: {report_context.get('package', 'unknown')}"]
    if report_context.get('verdict'):
        ctx_parts.append(f"**Verdict**: {report_context['verdict']} ({report_context.get('confidence', '?')}% confidence)")
    if report_context.get('executive_summary'):
        ctx_parts.append(f"**Executive Summary**: {report_context['executive_summary']}")
    if report_context.get('highRisk'):
        ctx_parts.append(f"**High-Risk Permissions**: {', '.join(report_context['highRisk'])}")
    if report_context.get('apiCalls'):
        apis = [f"{a['api']} in {a['file']}" for a in report_context['apiCalls'][:10]]
        ctx_parts.append(f"**Suspicious APIs**: {', '.join(apis)}")
    if report_context.get('mitre_techniques'):
        ctx_parts.append(f"**MITRE ATT&CK**: {', '.join(report_context['mitre_techniques'])}")
    if report_context.get('agent_findings'):
        for agent_id, finding in report_context['agent_findings'].items():
            detail = finding.get('detail', finding.get('summary', ''))
            ctx_parts.append(f"**{agent_id.title()} Agent**: {detail}")
    if report_context.get('recommended_actions'):
        ctx_parts.append(f"**Recommended Actions**: {report_context['recommended_actions']}")

    context = "\n".join(ctx_parts)

    try:
        print(f"[chat] Question: {question[:100]}", flush=True)
        response = llm_client.chat.completions.create(
            model="deepseek-v4-flash",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"## Analysis Context\n{context}\n\n## User Question\n{question}"},
            ],
            temperature=0.4,
            max_tokens=500,
        )
        answer = response.choices[0].message.content.strip()
        print(f"[chat] Answer: {answer[:100]}...", flush=True)
        return jsonify({'answer': answer})
    except Exception as e:
        print(f"[chat] ERROR: {type(e).__name__}: {e}", flush=True)
        return jsonify({'answer': f'Sorry, I encountered an error: {e}'}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050)
