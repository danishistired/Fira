import os


class UIAutomatorTool:
    def __init__(self, llm_client=None):
        self.llm_client = llm_client
        self._target_package = None
        self._device = None

    def set_target_package(self, package_name):
        self._target_package = package_name
        try:
            import uiautomator2 as u2
            self._device = u2.connect()
            if package_name:
                self._device.app_start(package_name)
            return True
        except Exception as exc:
            print(f"[UIAutomator] Could not connect or launch {package_name}: {exc}", flush=True)
            self._device = None
            return False

    def execute(self, action="dump", apk_path=None, package_name=None, **kwargs):
        try:
            import uiautomator2 as u2
        except ImportError:
            return {"success": False, "skipped": True, "error": "uiautomator2 is not installed"}

        try:
            device = self._device or u2.connect()
            if self._target_package and action == "dump":
                package_name = self._target_package
            if action == "dump":
                xml = device.dump_hierarchy(compressed=False)
                elements = []
                import xml.etree.ElementTree as ET
                try:
                    root = ET.fromstring(xml)
                    for node in root.iter():
                        if node.tag.endswith("node"):
                            bounds = node.attrib.get("bounds", "")
                            text = node.attrib.get("text", "") or node.attrib.get("content-desc", "")
                            if text:
                                elements.append({"text": text, "bounds": bounds})
                except ET.ParseError:
                    pass
                return {
                    "success": True,
                    "ui_text": "\n".join(e["text"] for e in elements),
                    "elements": elements,
                    "screen": {
                        "package": package_name,
                        "activity": "",
                        "is_system_dialog": False,
                    },
                }
            if action == "info":
                info = device.info
                current_package = ""
                current_activity = ""
                try:
                    import subprocess
                    window = subprocess.run(
                        ["adb", "shell", "dumpsys", "window", "windows"],
                        capture_output=True, text=True, timeout=5,
                    ).stdout
                    for line in window.splitlines():
                        if "mCurrentFocus" in line:
                            text = line.strip()
                            parts = text.replace("}", "").split("/")
                            if len(parts) >= 2:
                                current_package = parts[-2].split()[-1]
                                current_activity = parts[-1]
                            break
                except Exception:
                    pass
                return {
                    "success": True,
                    "info": info,
                    "current_package": current_package,
                    "current_activity": current_activity,
                }
            if action == "click":
                x, y = kwargs.get("x"), kwargs.get("y")
                if x is None or y is None:
                    return {"success": False, "error": "x and y are required"}
                device.click(x, y)
                return {"success": True}
            if action == "long_click":
                x, y = kwargs.get("x"), kwargs.get("y")
                if x is None or y is None:
                    return {"success": False, "error": "x and y are required"}
                device.long_click(x, y)
                return {"success": True}
            if action == "input":
                x, y = kwargs.get("x"), kwargs.get("y")
                text = kwargs.get("text", "")
                if x is not None and y is not None:
                    device.click(x, y)
                device.send_keys(text)
                return {"success": True}
            if action == "press":
                key = kwargs.get("key")
                if key == "back":
                    device.press("back")
                elif key == "home":
                    device.press("home")
                else:
                    return {"success": False, "error": f"Unsupported key: {key}"}
                return {"success": True}
            if action == "swipe":
                direction = kwargs.get("direction", "down")
                device.swipe_ext(direction)
                return {"success": True}
            if action == "tap":
                text = kwargs.get("text")
                if not text:
                    return {"success": False, "error": "text is required"}
                device(text=text).click_exists()
                return {"success": True}
            return {"success": False, "error": f"Unsupported UI action: {action}"}
        except Exception as exc:
            return {"success": False, "error": str(exc)}
