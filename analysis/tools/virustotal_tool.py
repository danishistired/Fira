import hashlib
import os
import requests


class VirusTotalTool:
    def execute(self, apk_path=None, **kwargs):
        api_key = os.environ.get("VIRUSTOTAL_API_KEY", "")
        if not api_key:
            return {"success": False, "skipped": True, "summary": "VirusTotal skipped (no API key)", "known_malicious": False}
        if not apk_path or not os.path.isfile(apk_path):
            return {"success": False, "error": "APK file not found"}
        sha = hashlib.sha256(open(apk_path, "rb").read()).hexdigest()
        try:
            response = requests.get(
                f"https://www.virustotal.com/api/v3/files/{sha}",
                headers={"x-apikey": api_key},
                timeout=30,
            )
            if response.status_code == 404:
                return {"success": True, "hash": sha, "not_found": True,
                        "summary": "File hash not found in VirusTotal"}
            response.raise_for_status()
            attrs = response.json().get("data", {}).get("attributes", {})
            stats = attrs.get("last_analysis_stats", {})
            count = stats.get("malicious", 0)
            engine_count = sum(stats.values())
            tags = attrs.get("tags", [])
            return {
                "success": True,
                "hash": sha,
                "detection_count": count,
                "engine_count": engine_count,
                "detection_ratio": f"{count}/{engine_count}",
                "known_malicious": count > 0,
                "family_tags": tags,
                "summary": f"VirusTotal: {count}/{engine_count} engines detected this sample",
            }
        except Exception as exc:
            return {"success": False, "error": str(exc), "summary": f"VirusTotal lookup failed: {exc}"}
