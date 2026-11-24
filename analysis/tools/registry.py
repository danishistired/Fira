import copy


class ToolRegistry:
    def __init__(self):
        self._tools = {}

    def register(self, name, tool, metadata=None):
        self._tools[name] = {
            "instance": tool,
            "metadata": metadata or {},
        }

    def get(self, name):
        entry = self._tools.get(name)
        return entry["instance"] if entry else None

    def get_metadata(self, name):
        entry = self._tools.get(name)
        return entry["metadata"] if entry else {}

    def execute(self, name, **kwargs):
        entry = self._tools.get(name)
        if not entry:
            return {"success": False, "error": f"Unknown tool: {name}", "skipped": True}
        try:
            return entry["instance"].execute(**kwargs)
        except Exception as exc:
            return {"success": False, "error": str(exc), "skipped": True}

    def list_tool_names(self):
        return list(self._tools)

    def list_tools_for_planner(self, exclude=None):
        exclude = set(exclude or [])
        return [
            {
                "name": name,
                "description": entry["metadata"].get("description", name),
                "cost": entry["metadata"].get("cost", "medium"),
                "optional": entry["metadata"].get("optional", False),
            }
            for name, entry in self._tools.items()
            if name not in exclude
        ]

    def list_openai_tools(self, exclude=None):
        exclude = set(exclude or [])
        result = []
        for name, entry in self._tools.items():
            if name in exclude:
                continue
            result.append({
                "type": "function",
                "function": {
                    "name": name,
                    "description": entry["metadata"].get("description", name),
                    "parameters": entry["metadata"].get("parameters", {
                        "type": "object",
                        "properties": {},
                        "additionalProperties": True,
                    }),
                },
            })
        return result

    def auto_register(self, llm_client=None):
        from tools.manifest_tool import ManifestTool
        from tools.permission_tool import PermissionTool
        from tools.apktool_tool import APKToolTool
        from tools.jadx_tool import JADXTool
        from tools.frida_tool import FridaTool
        from tools.logcat_tool import LogcatTool
        from tools.monkey_tool import MonkeyTool
        from tools.screenshot_tool import ScreenshotTool
        from tools.mobsf_tool import MobSFTool
        from tools.network_tool import NetworkTool
        from tools.ui_tool import UIAutomatorTool

        self.register("extract_manifest", ManifestTool(), {
            "description": "Extract APK package name, activities, services and manifest permissions",
            "cost": "very_low",
            "parameters": {
                "type": "object",
                "properties": {"apk_path": {"type": "string"}},
                "required": ["apk_path"],
            },
        })
        self.register("scan_permissions", PermissionTool(), {
            "description": "Perform deep manifest and permission analysis",
            "cost": "low",
            "parameters": {
                "type": "object",
                "properties": {"apk_path": {"type": "string"}},
                "required": ["apk_path"],
            },
        })
        self.register("run_apktool", APKToolTool(), {
            "description": "Decompile APK resources and decode the Android manifest",
            "cost": "medium",
        })
        self.register("run_jadx", JADXTool(), {
            "description": "Decompile Java source and find suspicious APIs and hardcoded secrets",
            "cost": "high",
        })
        self.register("run_frida", FridaTool(), {
            "description": "Run Frida hooks dynamically on a connected Android device",
            "cost": "high",
        })
        self.register("collect_logcat", LogcatTool(), {
            "description": "Collect Android logcat output for the analyzed package",
            "cost": "low",
            "optional": True,
        })
        self.register("run_monkey", MonkeyTool(), {
            "description": "Exercise the application UI with Android Monkey",
            "cost": "medium",
            "optional": True,
        })
        self.register("capture_screenshot", ScreenshotTool(), {
            "description": "Capture a screenshot from the connected Android device",
            "cost": "low",
            "optional": True,
        })
        self.register("run_mobsf", MobSFTool(), {
            "description": "Send the APK to MobSF for independent static analysis",
            "cost": "medium",
            "optional": True,
        })
        self.register("capture_network_traffic", NetworkTool(), {
            "description": "Capture application network traffic with mitmproxy",
            "cost": "high",
            "optional": True,
        })
        self.register("run_ui_automation", UIAutomatorTool(llm_client), {
            "description": "Run automated UI exploration of the Android application",
            "cost": "high",
            "optional": True,
        })
        self.register("generate_report", copy.copy(object()), {
            "description": "Generate the final investigation report",
            "cost": "low",
        })
