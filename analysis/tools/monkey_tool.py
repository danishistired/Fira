import os
import subprocess
from shared.adb import ADB


class MonkeyTool:
    def execute(self, apk_path=None, package_name=None, events=300, throttle_ms=100, **kwargs):
        if not package_name:
            return {"success": False, "error": "Package name is required", "skipped": True}
        try:
            proc = subprocess.run(
                [ADB, "shell", "monkey", "-p", package_name, "--pct-syskeys", "10",
                 "--throttle", str(throttle_ms), str(events)],
                capture_output=True, text=True, timeout=90,
            )
            if proc.returncode != 0:
                return {"success": False, "error": proc.stderr[-4000:] or proc.stdout[-4000:]}
            return {"success": True, "output": proc.stdout[-8000:],
                    "events_requested": events, "summary": f"Monkey exercised {package_name}"}
        except Exception as exc:
            return {"success": False, "error": str(exc), "skipped": True}
