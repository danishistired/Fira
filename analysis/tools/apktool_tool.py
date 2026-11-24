import os
import subprocess


class APKToolTool:
    def execute(self, apk_path=None, output_dir=None, **kwargs):
        if not apk_path or not os.path.isfile(apk_path):
            return {"success": False, "error": "APK file not found"}
        tool_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "tools", "apktool"))
        jar = os.path.join(tool_root, "apktool.jar")
        if not os.path.isfile(jar):
            return {"success": False, "error": "APKTool not installed; run download_tools.ps1", "skipped": True}
        output_dir = output_dir or os.path.join(os.environ.get("ARGUS_TEMP_DIR", os.getenv("TEMP", ".")), "apktool")
        os.makedirs(output_dir, exist_ok=True)
        try:
            proc = subprocess.run(
                ["java", "-jar", jar, "d", "-f", "-o", output_dir, apk_path],
                capture_output=True, text=True, timeout=120,
            )
            if proc.returncode != 0:
                return {"success": False, "error": proc.stderr[-4000:] or proc.stdout[-4000:], "manifest_xml": ""}
            manifest_path = os.path.join(output_dir, "AndroidManifest.xml")
            manifest_xml = open(manifest_path, "r", encoding="utf-8", errors="replace").read() if os.path.isfile(manifest_path) else ""
            resource_strings = []
            resource_entries = []
            for root, _, files in os.walk(output_dir):
                for name in files:
                    if name == "strings.xml":
                        resource_strings.append(os.path.join(root, name))
                        try:
                            import xml.etree.ElementTree as ET
                            xml_root = ET.parse(os.path.join(root, name)).getroot()
                            for item in xml_root.findall(".//string"):
                                value = (item.text or "").strip()
                                if value:
                                    entry_type = "url" if value.lower().startswith(("http://", "https://")) else "string"
                                    resource_entries.append({
                                        "type": entry_type,
                                        "value": value,
                                        "file": os.path.join(root, name),
                                    })
                        except Exception:
                            pass
            if not resource_entries:
                resource_entries = [
                    {"type": "string", "value": path, "file": path}
                    for path in resource_strings
                ]
            return {"success": True, "manifest_xml": manifest_xml, "resource_strings": resource_strings,
                    "resource_entries": resource_entries,
                    "output_dir": output_dir, "summary": "APK resources decoded with APKTool"}
        except Exception as exc:
            return {"success": False, "error": str(exc)}
