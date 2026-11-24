import subprocess
from shared.adb import ADB


class LogcatTool:
    def execute(self, apk_path=None, package_name=None, max_lines=200, **kwargs):
        try:
            cmd = [ADB, "logcat", "-d", "-t", str(max_lines)]
            if package_name:
                pid = subprocess.run([ADB, "shell", "pidof", package_name],
                                     capture_output=True, text=True, timeout=5)
                if pid.stdout.strip():
                    cmd = [ADB, "logcat", "-d", "-t", str(max_lines), "--pid", pid.stdout.strip().split()[0]]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if proc.returncode != 0:
                return {"success": False, "error": proc.stderr.strip() or "ADB logcat failed"}
            lines = proc.stdout.splitlines()
            return {"success": True, "lines": lines, "summary": f"Collected {len(lines)} logcat lines"}
        except Exception as exc:
            return {"success": False, "error": str(exc), "skipped": True}
