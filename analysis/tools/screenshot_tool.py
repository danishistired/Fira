import os
import subprocess
import time
from shared.adb import ADB


class ScreenshotTool:
    def execute(self, apk_path=None, package_name=None, **kwargs):
        try:
            output_root = os.environ.get("ARGUS_ARTIFACTS_DIR")
            if not output_root:
                output_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "artifacts"))
            os.makedirs(output_root, exist_ok=True)
            remote = "/sdcard/argus_screenshot.png"
            proc = subprocess.run([ADB, "shell", "screencap", "-p", remote],
                                  capture_output=True, timeout=10)
            if proc.returncode != 0:
                return {"success": False, "error": "ADB screencap failed", "skipped": True}
            local = os.path.join(output_root, f"screenshot_{int(time.time())}.png")
            pull = subprocess.run([ADB, "pull", remote, local],
                                  capture_output=True, text=True, timeout=20)
            subprocess.run([ADB, "shell", "rm", remote], capture_output=True, timeout=5)
            if pull.returncode != 0 or not os.path.isfile(local):
                return {"success": False, "error": pull.stderr.strip() or "Screenshot pull failed"}
            return {"success": True, "path": local, "summary": f"Captured screenshot to {local}"}
        except Exception as exc:
            return {"success": False, "error": str(exc), "skipped": True}
