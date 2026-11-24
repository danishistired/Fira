import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

from shared.adb import ADB


class NetworkTool:
    def execute(self, apk_path=None, package_name=None, duration_seconds=20, **kwargs):
        mitmdump = shutil.which("mitmdump") or shutil.which("mitmdump.exe")
        candidates = [
            os.path.join(os.path.dirname(sys.executable), "Scripts", "mitmdump.exe"),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), ".venv", "Scripts", "mitmdump.exe"),
            os.path.join(os.path.dirname(sys.executable), "mitmdump.exe"),
        ]
        if not mitmdump:
            mitmdump = next((path for path in candidates if os.path.isfile(path)), "")
        addon = os.path.join(os.path.dirname(__file__), "mitm_capture_addon.py")
        if not os.path.isfile(mitmdump):
            return {"success": False, "skipped": True,
                    "error": "mitmdump executable not found",
                    "flows": [], "summary": "Network capture skipped: mitmdump unavailable"}
        if not os.path.isfile(addon):
            return {"success": False, "skipped": True,
                    "error": "Network capture addon not found",
                    "flows": [], "summary": "Network capture skipped: addon unavailable"}

        temp_dir = tempfile.mkdtemp(prefix="argus-network-")
        flows_path = os.path.join(temp_dir, "flows.jsonl")
        proxy_port = "8080"
        mitm_process = None
        try:
            mitm_process = subprocess.Popen(
                [mitmdump, "--listen-host", os.environ.get("ARGUS_MITM_LISTEN_HOST", "127.0.0.1"),
                 "--listen-port", proxy_port,
                 "-s", addon, "--set", f"flow_log={flows_path}",
                 "--set", "ssl_insecure=true", "--set", "block_global=false"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
            )
            time.sleep(2)
            if mitm_process.poll() is not None:
                error = mitm_process.stderr.read()[-4000:] if mitm_process.stderr else "mitmdump exited"
                return {"success": False, "error": error, "flows": []}

            subprocess.run([ADB, "reverse", f"tcp:{proxy_port}", f"tcp:{proxy_port}"],
                           capture_output=True, timeout=10)
            subprocess.run([ADB, "shell", "settings", "put", "global", "http_proxy",
                            f"10.0.2.2:{proxy_port}"],
                           capture_output=True, timeout=10)

            time.sleep(max(1, int(duration_seconds)))

            flows = []
            if os.path.isfile(flows_path):
                with open(flows_path, "r", encoding="utf-8") as fh:
                    for line in fh:
                        try:
                            flow = json.loads(line)
                            flows.append({
                                "timestamp": flow.get("timestamp"),
                                "method": flow.get("method"),
                                "scheme": flow.get("scheme"),
                                "host": flow.get("host"),
                                "port": flow.get("port"),
                                "path": flow.get("path"),
                                "status": flow.get("status"),
                                "request_size": flow.get("request_size", 0),
                                "response_size": flow.get("response_size", 0),
                            })
                        except json.JSONDecodeError:
                            continue

            return {
                "success": True,
                "flows": flows,
                "flow_count": len(flows),
                "log_path": flows_path,
                "summary": f"Captured {len(flows)} network flows",
            }
        except Exception as exc:
            return {"success": False, "error": str(exc), "flows": []}
        finally:
            try:
                subprocess.run([ADB, "shell", "settings", "put", "global", "http_proxy", ":0"],
                               capture_output=True, timeout=10)
                subprocess.run([ADB, "reverse", "--remove", f"tcp:{proxy_port}"],
                               capture_output=True, timeout=10)
            except Exception:
                pass
            if mitm_process is not None:
                mitm_process.terminate()
                try:
                    mitm_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    mitm_process.kill()
