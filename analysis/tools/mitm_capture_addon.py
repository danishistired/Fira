import json
import os
import time

from mitmproxy import ctx


class ArgusCaptureAddon:
    def load(self, loader):
        loader.add_option(
            "flow_log",
            str,
            "",
            "JSON lines destination for captured flows",
        )

    def response(self, flow):
        path = flow.options.get("flow_log", "") if hasattr(flow, "options") else ""
        if not path:
            path = ctx.options.flow_log
        if not path:
            return

        request = flow.request
        response = flow.response
        record = {
            "timestamp": time.time(),
            "method": request.method,
            "scheme": request.scheme,
            "host": request.host,
            "port": request.port,
            "path": request.path,
            "status": response.status_code if response else None,
            "request_size": len(request.raw_content or b""),
            "response_size": len(response.raw_content or b"") if response else 0,
        }
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(record) + "\n")


addons = [ArgusCaptureAddon()]
