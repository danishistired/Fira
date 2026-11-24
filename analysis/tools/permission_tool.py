from tools.manifest_tool import ManifestTool


class PermissionTool:
    def execute(self, apk_path=None, **kwargs):
        result = ManifestTool().execute(apk_path=apk_path)
        if not result.get("success"):
            return result
        return {
            "success": True,
            "package_name": result.get("package_name"),
            "permissions": result.get("permissions", []),
            "high_risk_permissions": result.get("high_risk_permissions", []),
            "manifest_vulnerabilities": [
                {"permission": p, "risk": "high"}
                for p in result.get("high_risk_permissions", [])
            ],
            "signing_info": {},
            "summary": f"Analyzed {len(result.get('permissions', []))} permissions",
        }
