"""
analysis/shared/adb.py

Centralized ADB path resolution for all ARGUS tools.

Resolves the adb binary once at import time, checking common
Android SDK locations so tools don't need adb on PATH.

Usage:
    from shared.adb import ADB

    subprocess.run([ADB, "devices"], ...)
"""

import os
import shutil


def _resolve_adb() -> str:
    """Return the full path to adb, checking common Android SDK locations.

    Search order:
      1. ADB_PATH env var (explicit override)
      2. shutil.which("adb") — checks PATH properly
      3. ANDROID_HOME / ANDROID_SDK_ROOT env vars (standard SDK env)
      4. %LOCALAPPDATA%\\Android\\Sdk  (Android Studio default on Windows)
      5. ~/Android/Sdk                 (Android Studio default on Linux/macOS)
      6. Plain 'adb' — last-resort fallback
    """
    # 1. Explicit override
    explicit = os.environ.get("ADB_PATH", "")
    if explicit and os.path.isfile(explicit):
        return explicit

    # 2. Check PATH properly via shutil.which
    which_result = shutil.which("adb")
    if which_result:
        return which_result

    # 3 & 4. SDK root env vars + well-known Windows/Linux paths
    candidate_roots = [
        os.environ.get("ANDROID_HOME", ""),
        os.environ.get("ANDROID_SDK_ROOT", ""),
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "Android", "Sdk"),
        os.path.join(os.path.expanduser("~"), "Android", "Sdk"),
        os.path.join(os.path.expanduser("~"), "AppData", "Local", "Android", "Sdk"),
    ]
    adb_bin = "adb.exe" if os.name == "nt" else "adb"
    for root in candidate_roots:
        if root:
            candidate = os.path.join(root, "platform-tools", adb_bin)
            if os.path.isfile(candidate):
                return candidate

    # 5. Fallback to bare name
    return "adb"


# Resolve once at module load — all importers share this value.
ADB = _resolve_adb()
print(f"[ADB] Resolved: {ADB}", flush=True)
