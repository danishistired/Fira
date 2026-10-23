"""
Shared constants for ARGUS analysis engine.

Extracted from the original app.py monolith. These constants define the
detection patterns, risk thresholds, and scoring weights used across
the tool layer and evidence preprocessing.

No logic lives here — just data definitions.
"""

import os
import re

# ---------- Temp / Cache Directory ----------
# Route all temporary files to D: drive to avoid filling the C: system drive.
# Falls back to the system default if D:\argus-temp doesn't exist / can't be created.
ARGUS_TEMP_DIR = os.path.join("D:\\", "argus-temp")
os.makedirs(ARGUS_TEMP_DIR, exist_ok=True)

# ---------- High-Risk Permission Set ----------
# These permissions represent capabilities that are commonly abused by malware.
# Used by the manifest tool and scoring engine to flag dangerous permissions.
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


# ---------- Suspicious API Patterns ----------
# Signal levels:
#   HIGH   = always send to LLM — genuine threat indicators
#   MEDIUM = send but lower priority — context-dependent
#   LOW    = counted only, not individually listed — ubiquitous in legitimate apps
#
# APIs that are normal Android behavior (startActivity, getIntent, Log.*,
# System.out.println, registerReceiver, sendBroadcast) are NOT tracked at all.
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


# ---------- Library Noise Suppression ----------
# Patterns that should be suppressed when found inside standard library paths.
# This prevents flooding the LLM with findings from androidx, okhttp, etc.
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


# ---------- Hardcoded Secret Patterns ----------
# Regex patterns for detecting hardcoded credentials in Java source.
# Each entry is (compiled_regex, label_string).
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


# ---------- Risk Scoring Weights ----------
# Per-finding weighted scores based on actual threat severity.
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


# ---------- Static-to-Dynamic Correlation Map ----------
# Maps static API pattern descriptions to Frida event types.
# Used by the correlation engine to match static capabilities
# against runtime observations.
STATIC_TO_DYNAMIC_MAP = {
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
