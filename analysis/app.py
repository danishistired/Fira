import os
import tempfile
import subprocess
import shutil
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

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

# Ensure Java is in PATH for apktool and jadx (winget default path)
java_path = r"C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot\bin"
if os.path.exists(java_path) and java_path not in os.environ["PATH"]:
    os.environ["PATH"] = java_path + os.pathsep + os.environ["PATH"]

# Simple high-risk permission set for scoring
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
}

SUSPICIOUS_API_PATTERNS = {
    "SmsManager": "SMS Operations",
    "Runtime.getRuntime().exec": "Command Execution",
    "TelephonyManager.getDeviceId": "Device ID Extraction",
    "getLastKnownLocation": "Location Tracking",
    "MediaRecorder.start": "Audio/Video Recording",
    "DexClassLoader": "Dynamic Code Loading",
    "HttpURLConnection": "Network Connection",
}

# Compute project root once at module level using pathlib (reliable even when __file__ is relative)
from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parent.parent

TOOL_PATHS = {
    'apktool': PROJECT_ROOT / 'tools' / 'apktool' / 'apktool.bat',
    'jadx': PROJECT_ROOT / 'tools' / 'jadx' / 'bin' / 'jadx.bat',
}

print(f"[INIT] PROJECT_ROOT = {PROJECT_ROOT}", flush=True)
for tool_name, tool_p in TOOL_PATHS.items():
    print(f"[INIT] {tool_name} -> {tool_p} (exists={tool_p.exists()})", flush=True)

def get_tool_path(name):
    local_path = TOOL_PATHS.get(name)
    if local_path and local_path.exists():
        print(f"[get_tool_path] {name} found at {local_path}", flush=True)
        return str(local_path)
    which_path = shutil.which(name)
    print(f"[get_tool_path] {name} not in project, shutil.which -> {which_path}", flush=True)
    return which_path

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
        if stdout.strip():
            print(f"[run_apktool] STDOUT:\n{stdout}", flush=True)
        if stderr.strip():
            print(f"[run_apktool] STDERR:\n{stderr}", flush=True)
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
        if stdout.strip():
            print(f"[run_jadx] STDOUT:\n{stdout}", flush=True)
        if stderr.strip():
            print(f"[run_jadx] STDERR:\n{stderr}", flush=True)
        if result.returncode != 0:
            return False, f"JADX error (rc={result.returncode}): {stderr or stdout}"
        return True, "JADX decompilation successful"
    except Exception as e:
        print(f"[run_jadx] EXCEPTION: {type(e).__name__}: {e}", flush=True)
        return False, f"JADX exception: {e}"

def extract_api_calls_from_source(source_dir):
    found_apis = []
    if not os.path.exists(source_dir):
        return found_apis

    for root, _, files in os.walk(source_dir):
        for f in files:
            if f.endswith('.java'):
                file_path = os.path.join(root, f)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as fp:
                        content = fp.read()
                        for pattern, desc in SUSPICIOUS_API_PATTERNS.items():
                            if pattern in content:
                                entry = {"api": pattern, "description": desc, "file": f}
                                if entry not in found_apis:
                                    found_apis.append(entry)
                except Exception:
                    pass
    return found_apis

@app.route('/analyze', methods=['POST'])
def analyze_apk():
    print(f"\n{'='*60}", flush=True)
    print(f"[analyze_apk] REQUEST RECEIVED - file in request.files: {'file' in request.files}", flush=True)
    if 'file' not in request.files:
        return jsonify({'error': 'no file provided'}), 400
    f = request.files['file']
    print(f"[analyze_apk] filename={f.filename}", flush=True)
    if f.filename == '':
        return jsonify({'error': 'empty filename'}), 400

    tmp_fd, tmp_path = tempfile.mkstemp(suffix='.apk')
    os.close(tmp_fd)
    
    # Create temp dirs for tools
    apktool_out = tempfile.mkdtemp(prefix='apktool_')
    jadx_out = tempfile.mkdtemp(prefix='jadx_')
    
    try:
        f.save(tmp_path)
        
        # 1. Androguard Permissions
        apk = APK(tmp_path)
        permissions = apk.get_permissions() or []
        used_high_risk = [p for p in permissions if p in HIGH_RISK_PERMISSIONS]
        
        # 2. APKtool extraction
        apktool_success, apktool_msg = run_apktool(tmp_path, apktool_out)
        
        # 3. JADX decompilation
        jadx_success, jadx_msg = run_jadx(tmp_path, jadx_out)
        
        # 4. API call extraction
        api_calls = []
        if jadx_success:
            api_calls = extract_api_calls_from_source(jadx_out)
            
        # Scoring logic
        score = 0
        if permissions:
            score += (len(used_high_risk) / len(permissions)) * 60  # max 60% from permissions
            
        if api_calls:
            # max 40% from API calls (each suspicious API adds 10%)
            score += min(40, len(api_calls) * 10)
            
        result = {
            'package': apk.get_package(),
            'permissions': permissions,
            'high_risk_permissions': used_high_risk,
            'api_calls': api_calls,
            'pipeline_status': {
                'apktool': {'success': apktool_success, 'message': apktool_msg},
                'jadx': {'success': jadx_success, 'message': jadx_msg}
            },
            'permission_score_percent': round(score, 2),
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        try:
            os.remove(tmp_path)
            shutil.rmtree(apktool_out, ignore_errors=True)
            shutil.rmtree(jadx_out, ignore_errors=True)
        except Exception:
            pass

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050)
