import os
import zipfile
import xml.etree.ElementTree as ET


class ManifestTool:
    def execute(self, apk_path=None, **kwargs):
        if not apk_path or not os.path.isfile(apk_path):
            return {"success": False, "error": "APK file not found", "apk_path": apk_path}

        try:
            from androguard.core.apk import APK
            apk = APK(apk_path)
            package_name = apk.get_package() or "unknown"
            permissions = sorted(set(apk.get_permissions() or []))
            activities = sorted(set(apk.get_activities() or []))
            services = sorted(set(apk.get_services() or []))
            high_risk = {
                "android.permission.SEND_SMS",
                "android.permission.RECEIVE_SMS",
                "android.permission.READ_SMS",
                "android.permission.RECORD_AUDIO",
                "android.permission.CAMERA",
                "android.permission.READ_CONTACTS",
                "android.permission.READ_CALL_LOG",
                "android.permission.CALL_PHONE",
                "android.permission.ACCESS_FINE_LOCATION",
            }
            return {
                "success": True,
                "package_name": package_name,
                "permissions": permissions,
                "high_risk_permissions": sorted(high_risk.intersection(permissions)),
                "activities": activities,
                "services": services,
                "summary": f"Extracted manifest for {package_name}: {len(permissions)} permissions",
            }
        except ImportError:
            pass
        except Exception as exc:
            print(f"[Manifest] Androguard extraction failed, using fallback: {exc}", flush=True)

        try:
            with zipfile.ZipFile(apk_path) as apk:
                if "AndroidManifest.xml" not in apk.namelist():
                    return {"success": False, "error": "AndroidManifest.xml not found"}
                data = apk.read("AndroidManifest.xml")

            try:
                root = ET.fromstring(data)
            except ET.ParseError:
                return self._fallback_manifest(data, apk_path)

            android_ns = "{http://schemas.android.com/apk/res/android}"
            package_name = root.attrib.get("package", "unknown")
            permissions = sorted({
                elem.attrib[android_ns + "name"]
                for elem in root.iter()
                if elem.tag.endswith("uses-permission")
                and android_ns + "name" in elem.attrib
            })
            activities = [
                elem.attrib.get(android_ns + "name", "")
                for elem in root.iter()
                if elem.tag.endswith("activity")
            ]
            services = [
                elem.attrib.get(android_ns + "name", "")
                for elem in root.iter()
                if elem.tag.endswith("service")
            ]
            return {
                "success": True,
                "package_name": package_name,
                "permissions": permissions,
                "high_risk_permissions": [
                    p for p in permissions
                    if p in {
                        "android.permission.SEND_SMS", "android.permission.RECEIVE_SMS",
                        "android.permission.READ_SMS", "android.permission.RECORD_AUDIO",
                        "android.permission.CAMERA", "android.permission.READ_CONTACTS",
                        "android.permission.READ_CALL_LOG", "android.permission.CALL_PHONE",
                        "android.permission.ACCESS_FINE_LOCATION",
                    }
                ],
                "activities": activities,
                "services": services,
                "summary": f"Extracted manifest for {package_name}: {len(permissions)} permissions",
            }
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    def _fallback_manifest(self, data, apk_path):
        text = data.decode("utf-8", "replace")
        package = "unknown"
        import re
        match = re.search(r'package=[^ >]+', text)
        if match:
            package = match.group(0).split("=", 1)[1].strip("\"'")
        permissions = sorted(set(re.findall(r"android\.permission\.[A-Z0-9_]+", text)))
        return {
            "success": True,
            "package_name": package,
            "permissions": permissions,
            "high_risk_permissions": [],
            "activities": [],
            "services": [],
            "summary": f"Extracted partial manifest metadata for {package}",
        }
