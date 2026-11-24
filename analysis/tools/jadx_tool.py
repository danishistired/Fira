import os
import re
import subprocess
import time

from shared.constants import (
    SUSPICIOUS_API_PATTERNS,
    LIBRARY_PATH_PREFIXES,
    HARDCODED_SECRET_PATTERNS,
)


class JADXTool:
    def execute(self, apk_path=None, **kwargs):
        if not apk_path or not os.path.isfile(apk_path):
            return {"success": False, "error": "APK file not found"}
        root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "tools", "jadx"))
        jadx = os.path.join(root, "bin", "jadx.bat" if os.name == "nt" else "jadx")
        if not os.path.isfile(jadx):
            return {"success": False, "error": "JADX not installed; run download_tools.ps1", "skipped": True}

        output_dir = os.path.join(os.environ.get("TEMP", "."), "argus-jadx", str(int(time.time())))
        os.makedirs(output_dir, exist_ok=True)
        try:
            proc = subprocess.run([jadx, "-d", output_dir, "-q", apk_path],
                                  capture_output=True, text=True, timeout=240)
            if proc.returncode != 0:
                return {"success": False, "error": proc.stderr[-4000:] or proc.stdout[-4000:]}
        except Exception as exc:
            return {"success": False, "error": str(exc)}

        suspicious = []
        secrets = []
        files_scanned = 0
        for base, _, names in os.walk(output_dir):
            for name in names:
                if not name.endswith(".java"):
                    continue
                files_scanned += 1
                path = os.path.join(base, name)
                rel = os.path.relpath(path, output_dir).replace("\\", "/")
                if rel.startswith(LIBRARY_PATH_PREFIXES):
                    continue
                try:
                    text = open(path, "r", encoding="utf-8", errors="replace").read()
                except OSError:
                    continue
                for line_no, line in enumerate(text.splitlines(), 1):
                    for api, (description, signal) in SUSPICIOUS_API_PATTERNS.items():
                        if api in line:
                            suspicious.append({
                                "api": api,
                                "description": description,
                                "signal": signal,
                                "file": rel,
                                "line": line_no,
                                "code": line.strip()[:300],
                            })
                            break
                    for regex, label in HARDCODED_SECRET_PATTERNS:
                        match = regex.search(line)
                        if match:
                            secrets.append({
                                "type": label,
                                "file": rel,
                                "line": line_no,
                                "value_preview": match.group(0)[:120],
                            })

        return {
            "success": True,
            "output_dir": output_dir,
            "files_scanned": files_scanned,
            "suspicious_apis": suspicious[:500],
            "hardcoded_secrets": secrets[:500],
            "code_snippets": [],
            "summary": f"JADX scanned {files_scanned} Java files; found {len(suspicious)} suspicious APIs and {len(secrets)} secrets",
        }
