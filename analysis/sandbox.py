import os
import subprocess
import time
import tempfile
import frida
import threading
import lzma
import urllib.request

# Directory to cache frida-server downloads
FRIDA_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.frida-cache')

class SandboxOrchestrator:
    def __init__(self):
        self.device = None
        self.dynamic_logs = []
        self.is_running = False

    def check_emulator(self):
        """Check if an Android emulator is connected via adb."""
        try:
            result = subprocess.run(["adb", "devices"], capture_output=True, text=True, timeout=5)
            lines = result.stdout.strip().split("\n")[1:] # Skip first line "List of devices attached"
            
            devices = [line.split("\t")[0] for line in lines if "device" in line and not "offline" in line]
            if devices:
                print(f"[Sandbox] Found emulator/device: {devices[0]}")
                return True
            print("[Sandbox] No active emulator found.")
            return False
        except FileNotFoundError:
            print("[Sandbox] ADB not found in PATH.")
            return False
        except Exception as e:
            print(f"[Sandbox] ADB check failed: {e}")
            return False

    def _get_device_arch(self):
        """Get the CPU architecture of the connected device/emulator."""
        result = subprocess.run(
            ["adb", "shell", "getprop", "ro.product.cpu.abi"],
            capture_output=True, text=True, timeout=5
        )
        abi = result.stdout.strip()
        # Map Android ABI to Frida arch names
        arch_map = {
            "arm64-v8a": "arm64",
            "armeabi-v7a": "arm",
            "x86_64": "x86_64",
            "x86": "x86",
        }
        arch = arch_map.get(abi, abi)
        print(f"[Sandbox] Device ABI: {abi} -> Frida arch: {arch}")
        return arch

    def _is_frida_server_running(self):
        """Check if frida-server is already running on the device."""
        try:
            result = subprocess.run(
                ["adb", "shell", "ps -A | grep frida"],
                capture_output=True, text=True, timeout=5, shell=False
            )
            return "frida" in result.stdout.lower()
        except Exception:
            return False

    def ensure_frida_server(self):
        """Ensure frida-server is running on the connected device.
        Downloads the matching version if needed, pushes it, and starts it.
        """
        if self._is_frida_server_running():
            print("[Sandbox] frida-server is already running on device.")
            return True

        print("[Sandbox] frida-server not running. Setting up...")

        # Ensure root access
        try:
            root_result = subprocess.run(["adb", "root"], capture_output=True, text=True, timeout=10)
            print(f"[Sandbox] ADB root: {root_result.stdout.strip()}")
            time.sleep(2)  # Wait for adbd restart
        except Exception as e:
            print(f"[Sandbox] Warning: adb root failed ({e}). frida-server may not start without root.")

        version = frida.__version__
        arch = self._get_device_arch()
        server_name = f"frida-server-{version}-android-{arch}"
        xz_name = f"{server_name}.xz"

        os.makedirs(FRIDA_CACHE_DIR, exist_ok=True)
        local_binary = os.path.join(FRIDA_CACHE_DIR, server_name)

        # Download if not cached
        if not os.path.exists(local_binary):
            url = f"https://github.com/frida/frida/releases/download/{version}/{xz_name}"
            xz_path = os.path.join(FRIDA_CACHE_DIR, xz_name)
            print(f"[Sandbox] Downloading frida-server from {url}...")
            try:
                urllib.request.urlretrieve(url, xz_path)
                print(f"[Sandbox] Downloaded {xz_name}, extracting...")
                with lzma.open(xz_path, 'rb') as f_in:
                    with open(local_binary, 'wb') as f_out:
                        f_out.write(f_in.read())
                os.remove(xz_path)
                print(f"[Sandbox] Extracted to {local_binary}")
            except Exception as e:
                print(f"[Sandbox] Failed to download frida-server: {e}")
                return False
        else:
            print(f"[Sandbox] Using cached frida-server: {local_binary}")

        # Push to device
        device_path = "/data/local/tmp/frida-server"
        print(f"[Sandbox] Pushing frida-server to {device_path}...")
        try:
            subprocess.run(["adb", "push", local_binary, device_path],
                          capture_output=True, text=True, timeout=30)
            subprocess.run(["adb", "shell", f"chmod 755 {device_path}"],
                          capture_output=True, text=True, timeout=5)
        except Exception as e:
            print(f"[Sandbox] Failed to push frida-server: {e}")
            return False

        # Start frida-server in background
        print("[Sandbox] Starting frida-server on device...")
        try:
            subprocess.Popen(
                ["adb", "shell", f"{device_path} -D &"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            time.sleep(2)  # Give it a moment to start

            if self._is_frida_server_running():
                print("[Sandbox] frida-server started successfully.")
                return True
            else:
                print("[Sandbox] frida-server may not have started. Trying anyway...")
                return True  # Proceed anyway, spawn/attach will give clearer errors
        except Exception as e:
            print(f"[Sandbox] Failed to start frida-server: {e}")
            return False

    def install_apk(self, apk_path):
        """Install APK via ADB."""
        print(f"[Sandbox] Installing APK: {apk_path}...")
        try:
            result = subprocess.run(["adb", "install", "-r", "-g", apk_path], capture_output=True, text=True, timeout=60)
            if "Success" in result.stdout:
                print("[Sandbox] Install successful.")
                return True
            else:
                print(f"[Sandbox] Install failed: {result.stdout} {result.stderr}")
                return False
        except Exception as e:
            print(f"[Sandbox] Install exception: {e}")
            return False

    def uninstall_apk(self, package_name):
        """Uninstall APK via ADB."""
        print(f"[Sandbox] Uninstalling {package_name}...")
        try:
            subprocess.run(["adb", "uninstall", package_name], capture_output=True, timeout=10)
        except Exception:
            pass

    def launch_app(self, package_name):
        """Launch the app using ADB monkey and return its PID, or None on failure."""
        print(f"[Sandbox] Launching {package_name}...")
        try:
            subprocess.run(
                ["adb", "shell", "monkey", "-p", package_name, "-c", "android.intent.category.LAUNCHER", "1"],
                capture_output=True, timeout=10
            )
            time.sleep(3)  # Give it a moment to start
            # Verify the process is actually running and get its PID
            check = subprocess.run(
                ["adb", "shell", "pidof", package_name],
                capture_output=True, text=True, timeout=5
            )
            pid_str = check.stdout.strip()
            if pid_str:
                # pidof can return multiple PIDs separated by spaces; take the first
                pid = int(pid_str.split()[0])
                print(f"[Sandbox] Process {package_name} is alive (PID: {pid}).")
                return pid
            else:
                print(f"[Sandbox] Process {package_name} did not stay alive after launch.")
                return None
        except Exception as e:
            print(f"[Sandbox] Launch failed: {e}")
            return None

    def on_frida_message(self, message, data):
        """Callback for messages sent from Frida hooks.js"""
        if message['type'] == 'send':
            payload = message.get('payload', {})
            if isinstance(payload, dict) and payload.get('type') == 'log':
                log_data = payload.get('data', '')
                print(f"[Frida] {log_data}")
                self.dynamic_logs.append(log_data)
        elif message['type'] == 'error':
            err = message.get('description', '')
            print(f"[Frida Error] {err}")
            self.dynamic_logs.append(f"ERROR: {err}")

    def _load_hooks_script(self):
        """Load the Frida hooks.js script source.
        Handles frida-compile bundle format which has a metadata header."""
        hooks_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hooks.js')
        with open(hooks_path, 'r', encoding='utf-8') as f:
            content = f.read()
        # frida-compile adds a header like: 📦\n<size> <path>\n✄\n<actual code>
        # Strip it if present by finding the scissor line
        scissor = '✄\n'
        idx = content.find(scissor)
        if idx != -1:
            content = content[idx + len(scissor):]
        return content

    def _spawn_and_instrument(self, package_name, duration_seconds):
        """Primary method: use Frida spawn to start the app in suspended mode, inject hooks, then resume."""
        print("[Sandbox] Spawning process via Frida (spawn + resume)...")
        self.device = frida.get_usb_device(timeout=5)

        # Spawn the app — Frida starts it suspended so we can inject before any code runs
        pid = self.device.spawn([package_name])
        print(f"[Sandbox] Spawned {package_name} with PID {pid}")

        session = self.device.attach(pid)

        # Resume first so the ART/Dalvik VM initializes
        self.device.resume(pid)
        print(f"[Sandbox] Resumed PID {pid}. Waiting for Java VM to initialize...")
        time.sleep(3)  # Give the VM time to start

        # Now load hooks — Java runtime should be available
        script_code = self._load_hooks_script()
        script = session.create_script(script_code, runtime='v8')
        script.on('message', self.on_frida_message)
        script.load()

        print(f"[Sandbox] Hooks loaded. Monitoring for {duration_seconds}s...")
        time.sleep(duration_seconds)

        return session

    def _attach_with_retry(self, package_name, duration_seconds, max_retries=3):
        """Fallback method: launch via ADB then attach Frida by PID with retries."""
        print("[Sandbox] Falling back to ADB launch + Frida attach...")

        self.device = frida.get_usb_device(timeout=5)
        session = None

        # Try to get a PID — launch or re-check
        pid = self.launch_app(package_name)

        for attempt in range(1, max_retries + 1):
            # If we don't have a PID yet, re-check via pidof
            if pid is None:
                try:
                    check = subprocess.run(
                        ["adb", "shell", "pidof", package_name],
                        capture_output=True, text=True, timeout=5
                    )
                    pid_str = check.stdout.strip()
                    if pid_str:
                        pid = int(pid_str.split()[0])
                except Exception:
                    pass

            if pid is None:
                if attempt < max_retries:
                    wait = attempt * 2
                    print(f"[Sandbox] Process not found yet, waiting {wait}s before retry...")
                    time.sleep(wait)
                    continue
                else:
                    raise frida.ProcessNotFoundError(f"Process {package_name} not found after {max_retries} attempts")

            try:
                print(f"[Sandbox] Attaching Frida to PID {pid} (attempt {attempt}/{max_retries})...")
                session = self.device.attach(pid)
                print(f"[Sandbox] Attached to PID {pid}")

                script_code = self._load_hooks_script()
                script = session.create_script(script_code, runtime='v8')
                script.on('message', self.on_frida_message)
                script.load()

                print(f"[Sandbox] Monitoring {package_name} for {duration_seconds}s...")
                time.sleep(duration_seconds)
                return session
            except frida.ProcessNotFoundError:
                pid = None  # Reset so we re-check on next attempt
                if attempt < max_retries:
                    wait = attempt * 2
                    print(f"[Sandbox] Attach failed, waiting {wait}s before retry...")
                    time.sleep(wait)
                else:
                    raise
            except Exception as e:
                print(f"[Sandbox] Unexpected error attaching to PID {pid}: {e}")
                if attempt < max_retries:
                    pid = None
                    time.sleep(attempt * 2)
                else:
                    raise

        return session

    def run_dynamic_analysis(self, package_name, apk_path, duration_seconds=30):
        """Orchestrates the dynamic analysis phase."""
        self.dynamic_logs = []

        if not self.check_emulator():
            return {"success": False, "error": "No emulator connected", "logs": []}

        # 0. Ensure frida-server is running on the device
        self.ensure_frida_server()

        # 1. Install
        if not self.install_apk(apk_path):
            return {"success": False, "error": "Failed to install APK", "logs": []}

        # 2. Instrument & monitor
        session = None
        try:
            # Primary: use Frida spawn (no race condition)
            session = self._spawn_and_instrument(package_name, duration_seconds)
        except Exception as spawn_err:
            print(f"[Sandbox] Frida spawn failed ({spawn_err}), trying fallback...")
            session = None
            try:
                # Fallback: ADB launch + attach with retries
                session = self._attach_with_retry(package_name, duration_seconds)
            except frida.ProcessNotFoundError:
                print("[Sandbox] Frida could not find the running process after retries. "
                      "The app might have crashed or exited immediately.")
                self.dynamic_logs.append("Frida: Process exited or crashed before attachment.")
            except Exception as e:
                print(f"[Sandbox] Frida Error: {e}")
                self.dynamic_logs.append(f"Sandbox Error: {e}")
        finally:
            # Cleanup
            if session:
                try:
                    session.detach()
                except Exception:
                    pass
            self.uninstall_apk(package_name)

        return {
            "success": True,
            "logs": self.dynamic_logs
        }

if __name__ == "__main__":
    # Test script standalone
    orchestrator = SandboxOrchestrator()
    if orchestrator.check_emulator():
        print("Emulator is ready.")
        orchestrator.ensure_frida_server()
    else:
        print("Please start an Android emulator and ensure adb is available.")
