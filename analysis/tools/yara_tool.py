class YaraTool:
    def __init__(self, llm_client=None):
        self.llm_client = llm_client

    def execute(self, findings=None, package_name=None, apk_path=None,
                investigation_summary=None, **kwargs):
        name = "".join(c if c.isalnum() else "_" for c in (package_name or "argus_sample"))
        return {
            "success": False,
            "skipped": True,
            "rule_name": name,
            "yara_rule": "",
            "summary": "YARA generation requires the LLM findings; no rule generated",
        }
