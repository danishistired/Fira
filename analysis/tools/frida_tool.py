import os
import subprocess


def build_frida_result(logs, duration=120):
    logs = logs or []
    return {
        "success": bool(logs),
        "runtime_events": [],
        "raw_logs": logs,
        "hooks_triggered": sum("HOOK" in str(line).upper() for line in logs),
        "hooks_silent": 0,
        "duration_seconds": duration,
        "summary": f"Frida collected {len(logs)} log lines",
    }


class FridaTool:
    def execute(self, apk_path=None, package_name=None, duration_seconds=120, **kwargs):
        try:
            from sandbox import SandboxOrchestrator
            sandbox = SandboxOrchestrator()
            if not sandbox.check_emulator():
                return {"success": False, "skipped": True,
                        "error": "No Android device/emulator found",
                        "runtime_events": [], "raw_logs": [], "summary": "Frida skipped: no emulator"}
            if not package_name:
                return {"success": False, "error": "Package name is required"}
            result = sandbox.run_dynamic_analysis(package_name, apk_path, max_seconds=duration_seconds)
            logs = result.get("logs", [])
            out = build_frida_result(logs, duration_seconds)
            out["error"] = result.get("error")
            out["success"] = result.get("success", out["success"])
            return out
        except Exception as exc:
            return {"success": False, "error": str(exc), "runtime_events": [], "raw_logs": []}
