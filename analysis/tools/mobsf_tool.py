import os
import requests


class MobSFTool:
    def execute(self, apk_path=None, **kwargs):
        url = os.environ.get("MOBSF_URL", "http://localhost:8000").rstrip("/")
        api_key = os.environ.get("MOBSF_API_KEY", "")
        if not api_key or not apk_path or not os.path.isfile(apk_path):
            return {"success": False, "skipped": True,
                    "error": "MobSF or APK not configured"}
        try:
            headers = {"Authorization": api_key}
            with open(apk_path, "rb") as fh:
                upload = requests.post(f"{url}/api/v1/upload",
                                       headers=headers,
                                       files={"file": fh},
                                       timeout=60)
            upload.raise_for_status()
            data = upload.json()
            scan_hash = data.get("hash")
            if not scan_hash:
                return {"success": False, "error": "MobSF upload returned no hash"}
            scan = requests.post(f"{url}/api/v1/scan",
                                 headers=headers,
                                 data={"hash": scan_hash, "scan_type": "apk"},
                                 timeout=180)
            scan.raise_for_status()
            report = scan.json()
            return {
                "success": True,
                "hash": scan_hash,
                "mobsf_score": report.get("security_score"),
                "api_abuse": report.get("api", []) if isinstance(report.get("api"), list) else [],
                "certificate_issues": report.get("certificate_analysis", []) if isinstance(report.get("certificate_analysis"), list) else [],
                "hardcoded_secrets": report.get("secrets", []) if isinstance(report.get("secrets"), list) else [],
                "manifest_issues": report.get("manifest_analysis", []),
                "malware_checks": report.get("malware_permissions", []),
                "summary": f"MobSF analysis complete (score {report.get('security_score', '?')})",
            }
        except Exception as exc:
            return {"success": False, "error": str(exc), "skipped": True}
