"""
Minimal Frida Python test WITH bridge lazy loader.
Verifies that prepending the lazy getter + handling bridge requests
makes Java available — exactly like the Frida CLI does.

Usage:
    python test_frida_bridge_fix.py
"""

import frida
import time
import sys
from pathlib import Path

TARGET_PID = 2845  # com.android.insecurebankv2 (refreshed)

# Same minimal test the user originally used
TEST_SCRIPT = """
console.log("TEST Loaded");
setTimeout(function () {
    console.log("TEST typeof Java =", typeof Java);
    if (typeof Java !== "undefined") {
        Java.perform(function () {
            console.log("TEST Java works!");
        });
    } else {
        console.log("TEST Java missing");
    }
}, 5000);
"""

# Lazy Java bridge getter — mirrors frida-tools repl_agent.js
BRIDGE_LOADER_SNIPPET = """
// --- ARGUS Java bridge lazy loader (mirrors frida-tools repl_agent.js) ---
(function () {
    var _bridge = null;
    Object.defineProperty(globalThis, 'Java', {
        get: function () {
            if (_bridge !== null) return _bridge;
            try {
                send({"type": "frida:load-bridge", "name": "Java"});
                var _payload = null;
                recv("frida:bridge-loaded", function (r) { _payload = r; }).wait();
                var wrapper = "(function () {\\n" +
                    _payload.source + "\\n" +
                    "Object.defineProperty(globalThis, 'Java', { value: bridge });\\n" +
                    "return bridge;\\n" +
                    "})();";
                _bridge = eval(wrapper);
                return _bridge;
            } catch (e) {
                console.log("BRIDGE-LOADER-ERROR: " + (e.message || e) + " | stack: " + (e.stack || "none"));
                return undefined;
            }
        },
        configurable: true
    });
})();
// --- end ARGUS bridge loader ---
"""

def get_bridge_source():
    """Read bridges/java.js from frida-tools package."""
    import frida_tools
    bridge_path = Path(frida_tools.__file__).parent / "bridges" / "java.js"
    return bridge_path.read_text(encoding="utf-8")

def handle_bridge_request(message, script):
    """Respond to frida:load-bridge messages with bridge source."""
    if message.get("type") != "send":
        return False
    payload = message.get("payload")
    if not isinstance(payload, dict):
        return False
    if payload.get("type") != "frida:load-bridge":
        return False

    name = payload.get("name", "").lower()
    bridge_source = get_bridge_source()
    print(f"[Host] Got bridge request for '{name}', sending {len(bridge_source)} bytes")

    script.post({
        "type": "frida:bridge-loaded",
        "filename": f"{name}.js",
        "source": bridge_source,
    })
    return True

def test_with_bridge_loader():
    print("=" * 60)
    print("TEST: attach() + bridge loader + runtime=v8")
    print("=" * 60)

    device = frida.get_usb_device(timeout=5)
    print(f"Device: {device}")

    session = device.attach(TARGET_PID)
    print(f"Session attached to PID {TARGET_PID}")

    # Prepend the bridge loader BEFORE the test script
    full_script = BRIDGE_LOADER_SNIPPET + TEST_SCRIPT
    script = session.create_script(full_script, runtime="v8")

    def on_message(message, data):
        if handle_bridge_request(message, script):
            return
        if message['type'] == 'send':
            print(f"[Script] {message.get('payload', '')}")
        elif message['type'] == 'error':
            print(f"[Script Error] {message.get('description', '')}", file=sys.stderr)

    script.on('message', on_message)
    script.load()
    print("Script loaded. Waiting 10 seconds...")

    time.sleep(10)
    session.detach()
    print("Detached.\n")

if __name__ == "__main__":
    print(f"frida version: {frida.__version__}")
    print(f"Target PID: {TARGET_PID}")

    test_with_bridge_loader()
