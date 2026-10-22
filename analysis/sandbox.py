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

# Maximum wall-clock seconds any dynamic analysis session may run.
# A threading.Timer kills the session if it exceeds this regardless of
# what the caller requested — prevents runaway APKs from blocking the queue.
DYNAMIC_ANALYSIS_TIMEOUT = int(os.environ.get("ARGUS_DYNAMIC_TIMEOUT", "120"))

class FridaStreamHandle:
    """Live handle to a running Frida session.

    Allows the autonomous explorer to poll new log lines as they arrive
    (via the sandbox's ``on_frida_message`` callback), rather than
    waiting for the full monitoring window to end.

    Usage::

        handle = sandbox.start_frida_session(pkg, apk)
        while exploring:
            new_events = handle.poll_new_logs()
            # ... feed to LLM ...
        all_logs = handle.all_logs()
        handle.stop()
    """

    def __init__(self, sandbox: "SandboxOrchestrator", session, watchdog=None):
        self._sandbox = sandbox
        self._session = session
        self._watchdog = watchdog  # threading.Timer or None
        self._consumed_index: int = 0

    def poll_new_logs(self) -> list[str]:
        """Return log lines that arrived since the last poll, advancing the cursor."""
        logs = self._sandbox.dynamic_logs
        new = logs[self._consumed_index:]
        self._consumed_index = len(logs)
        return new

    def all_logs(self) -> list[str]:
        """Return ALL logs collected so far (does not advance cursor)."""
        return list(self._sandbox.dynamic_logs)

    def stop(self):
        """Detach the Frida session and cancel the watchdog timer."""
        if self._watchdog is not None:
            try:
                self._watchdog.cancel()
            except Exception:
                pass
        if self._session is not None:
            try:
                self._session.detach()
            except Exception:
                pass


class SandboxOrchestrator:
    def __init__(self):
        self.device = None
        self.dynamic_logs = []
        self.is_running = False
        self._abort_event = threading.Event()  # set by timeout guard to stop session

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

    def wait_for_emulator_ready(self, timeout: int = 30) -> bool:
        """Poll sys.boot_completed until the emulator is fully booted."""
        print(f"[Sandbox] Waiting up to {timeout}s for emulator to be ready...", flush=True)
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                result = subprocess.run(
                    ["adb", "shell", "getprop", "sys.boot_completed"],
                    capture_output=True, text=True, timeout=5,
                )
                if result.stdout.strip() == "1":
                    print("[Sandbox] Emulator is fully booted.", flush=True)
                    return True
            except Exception:
                pass
            time.sleep(2)
        print("[Sandbox] Emulator boot timeout.", flush=True)
        return False

    def cleanup_app_state(self, package_name: str):
        """Clear app data and cache before a fresh dynamic run.
        
        This ensures each analysis starts from a clean slate so
        previous runs don't pollute the state (e.g., cached prefs,
        activation flags, or previously established C2 sessions).
        """
        print(f"[Sandbox] Clearing app data for {package_name}...", flush=True)
        try:
            subprocess.run(
                ["adb", "shell", "pm", "clear", package_name],
                capture_output=True, text=True, timeout=10,
            )
        except Exception as e:
            print(f"[Sandbox] App state clear failed (non-fatal): {e}", flush=True)

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
        """Primary method: use Frida spawn, inject hooks, monitor for duration_seconds."""
        session = self._spawn_and_instrument_session(package_name)
        print(f"[Sandbox] Hooks loaded. Monitoring for {duration_seconds}s...")
        time.sleep(duration_seconds)
        return session

    def _spawn_and_instrument_session(self, package_name):
        """Setup Frida spawn + attach + hooks load — event-based handshake.

        Returns the live ``frida.Session``. The caller is responsible for
        waiting the desired duration and later detaching.

        Uses a threading.Event to wait for the JS script to confirm it
        loaded (``script_loaded`` message), then waits up to 15s for the
        Java VM to become available (``hooks_injected`` or first hook log).
        """
        print("[Sandbox] Spawning process via Frida (spawn + resume)...")
        self.device = frida.get_usb_device(timeout=5)

        # Spawn the app — Frida starts it suspended so we can inject before any code runs
        pid = self.device.spawn([package_name])
        print(f"[Sandbox] Spawned {package_name} with PID {pid}")

        session = self.device.attach(pid)

        # Resume first so the ART/Dalvik VM initializes
        self.device.resume(pid)
        print(f"[Sandbox] Resumed PID {pid}. Waiting for Java VM to initialize...")

        # ---- Dismiss system dialogs that block app startup ----
        # "App made for older version", compatibility warnings, etc.
        # Press Enter twice (clicks default button on most dialogs), then wait
        time.sleep(1.5)
        for _ in range(3):
            try:
                subprocess.run(
                    ["adb", "shell", "input", "keyevent", "KEYCODE_ENTER"],
                    capture_output=True, timeout=3,
                )
                time.sleep(0.6)
            except Exception:
                pass
        time.sleep(1)  # let the app start after dialog dismissal

        # ---- Event-based handshake ----
        script_loaded = threading.Event()
        java_ready = threading.Event()

        def _handshake_handler(message, data):
            """Intercept early messages to detect script-loaded and Java-ready."""
            # Still forward to the main handler
            self.on_frida_message(message, data)
            if message.get('type') == 'send':
                payload = message.get('payload', {})
                if isinstance(payload, dict):
                    ptype = payload.get('type', '')
                    pdata = payload.get('data', '')
                    if ptype == 'status' and pdata == 'script_loaded':
                        script_loaded.set()
                    elif ptype == 'log' and isinstance(pdata, str):
                        if 'Frida hooks injected successfully' in pdata:
                            java_ready.set()

        # Now load hooks — Java runtime should be available
        script_code = self._load_hooks_script()
        script = session.create_script(script_code, runtime="v8")
        script.on('message', _handshake_handler)
        script.load()

        # Wait for script to confirm it loaded (max 10s)
        if not script_loaded.wait(timeout=10):
            print("[Sandbox] WARNING: script did not send script_loaded within 10s — proceeding anyway", flush=True)
        else:
            print("[Sandbox] Script loaded confirmation received.", flush=True)

        # Wait for Java VM (max 15s after script loaded)
        if not java_ready.wait(timeout=15):
            print("[Sandbox] WARNING: Java VM did not become available within 15s — proceeding without Java hooks", flush=True)
        else:
            print("[Sandbox] Java VM ready — hooks injected.", flush=True)

        return session

    def _attach_with_retry(self, package_name, duration_seconds, max_retries=3):
        """Fallback method: launch via ADB then attach Frida by PID with retries."""
        session = self._attach_with_retry_session(package_name, max_retries)
        print(f"[Sandbox] Monitoring {package_name} for {duration_seconds}s...")
        time.sleep(duration_seconds)
        return session

    def _attach_with_retry_session(self, package_name, max_retries=3):
        """Setup ADB launch + Frida attach with retries — NO blocking sleep.

        Returns the live ``frida.Session``. The caller is responsible for
        waiting the desired duration and later detaching.
        """
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
                script = session.create_script(script_code, runtime="v8")
                script.on('message', self.on_frida_message)
                script.load()

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

    def run_dynamic_analysis(self, package_name, apk_path, duration_seconds=30, cleanup=True):
        """Orchestrates the dynamic analysis phase with lifecycle management.

        A global timeout guard (DYNAMIC_ANALYSIS_TIMEOUT) prevents runaway
        APKs from blocking the analysis queue indefinitely.

        Args:
            package_name: The app's package identifier.
            apk_path: Absolute path to the APK file.
            duration_seconds: How long to monitor with Frida hooks.
            cleanup: If True (default), uninstall the APK after analysis.
                     Set to False when other tools (network capture, monkey)
                     will run afterward and the orchestrator will clean up.
        """
        self.dynamic_logs = []
        self._abort_event.clear()

        if not self.check_emulator():
            return {"success": False, "error": "No emulator connected", "logs": []}

        # 0. Ensure frida-server is running on the device
        self.ensure_frida_server()

        # 0b. Clear previous app state for reproducibility
        self.cleanup_app_state(package_name)

        # 1. Install
        if not self.install_apk(apk_path):
            return {"success": False, "error": "Failed to install APK", "logs": []}

        # Start global watchdog — kills session if it exceeds the hard cap
        effective_timeout = min(duration_seconds + 30, DYNAMIC_ANALYSIS_TIMEOUT)
        watchdog_fired = threading.Event()

        def _watchdog():
            print(f"[Sandbox] WATCHDOG: session exceeded {effective_timeout}s — forcing abort", flush=True)
            self.dynamic_logs.append(f"WATCHDOG: analysis killed after {effective_timeout}s")
            self._abort_event.set()
            watchdog_fired.set()

        watchdog = threading.Timer(effective_timeout, _watchdog)
        watchdog.daemon = True
        watchdog.start()

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
            # Cancel watchdog (if it hasn't already fired)
            watchdog.cancel()
            # Cleanup
            if session:
                try:
                    session.detach()
                except Exception:
                    pass
            if cleanup:
                self.uninstall_apk(package_name)
            else:
                print(f"[Sandbox] Skipping uninstall — cleanup deferred to orchestrator.", flush=True)

        timed_out = watchdog_fired.is_set()
        return {
            "success": not timed_out,
            "timed_out": timed_out,
            "logs": self.dynamic_logs,
        }

    def start_frida_session(self, package_name, apk_path, max_seconds=330):
        """Start a streaming Frida session and return a live handle.

        Uses **attach-first** strategy: launches the app normally, dismisses
        any system dialogs, then attaches Frida to the already-running
        process (Java VM already initialised).  Falls back to spawn mode
        only if the process can't be found.

        Returns a ``FridaStreamHandle``.  Caller MUST call ``handle.stop()``.
        """
        self.dynamic_logs = []
        self._abort_event.clear()

        if not self.check_emulator():
            return {"success": False, "handle": None, "error": "No emulator connected"}

        # 0. Ensure frida-server is running
        self.ensure_frida_server()

        # 0b. Clear previous app state
        self.cleanup_app_state(package_name)

        # 1. Install
        if not self.install_apk(apk_path):
            return {"success": False, "handle": None, "error": "Failed to install APK"}

        # Start global watchdog
        watchdog_fired = [False]

        def _watchdog():
            print(f"[Sandbox] WATCHDOG: Frida session exceeded {max_seconds}s — forcing abort", flush=True)
            self.dynamic_logs.append(f"WATCHDOG: analysis killed after {max_seconds}s")
            self._abort_event.set()
            watchdog_fired[0] = True

        watchdog = threading.Timer(max_seconds, _watchdog)
        watchdog.daemon = True
        watchdog.start()

        # 2. Instrument — attach-first strategy
        session = None
        try:
            # Primary: launch app via ADB, dismiss dialogs, attach Frida
            session = self._launch_and_attach_session(package_name)
        except Exception as attach_err:
            print(f"[Sandbox] Attach-first failed ({attach_err}), trying spawn fallback...", flush=True)
            try:
                session = self._spawn_and_instrument_session(package_name)
            except Exception as spawn_err:
                print(f"[Sandbox] Spawn fallback also failed: {spawn_err}", flush=True)
                self.dynamic_logs.append(f"Sandbox Error: {spawn_err}")
                watchdog.cancel()
                return {"success": False, "handle": None, "error": str(spawn_err)}

        handle = FridaStreamHandle(self, session, watchdog)
        return {"success": True, "handle": handle, "error": ""}

    def _launch_and_attach_session(self, package_name):
        """Launch app via ADB, dismiss system dialogs, then attach Frida.

        This is more reliable than spawn mode because the Java VM is already
        initialised when the app runs normally. System dialogs ("older
        Android version", etc.) are dismissed before attachment.

        Improvements:
        - Polls until the app's activity is in foreground (up to 10s)
        - Verifies PID alive right before Frida attach
        - Longer settle time for ART VM initialization
        - Force-stops Expo Go if it's interfering
        - Disables Android Autofill service to prevent overlay popups
        """
        print("[Sandbox] Launching app via ADB (attach-first strategy)...", flush=True)

        self.device = frida.get_usb_device(timeout=5)

        # ---- Disable Android Autofill service ----
        # The autofill popup ("Autofill Credentials") blocks the app UI and
        # causes infinite dismiss loops. Disabling it is the cleanest fix.
        try:
            subprocess.run(
                ["adb", "shell", "settings", "put", "secure", "autofill_service", "null"],
                capture_output=True, timeout=5,
            )
            print("[Sandbox] Disabled Android Autofill service", flush=True)
        except Exception:
            pass

        # Force-stop known focus-stealing packages before launch
        # NOTE: Do NOT force-stop launchers — that causes Google Search / QSB
        # to steal focus instead, making things worse.
        for nuisance_pkg in ("host.exp.exponent",):
            try:
                subprocess.run(
                    ["adb", "shell", "am", "force-stop", nuisance_pkg],
                    capture_output=True, timeout=5,
                )
            except Exception:
                pass

        # Launch the app via monkey
        pid = self.launch_app(package_name)
        if pid is None:
            raise frida.ProcessNotFoundError(f"Could not launch {package_name}")

        # ---- Dismiss system dialogs aggressively ----
        # "App made for older version" and similar dialogs appear immediately
        # after launch. Dismiss them with Enter + tap before proceeding.
        for _ in range(5):
            time.sleep(0.8)
            try:
                # Press Enter (clicks default button on most dialogs)
                subprocess.run(
                    ["adb", "shell", "input", "keyevent", "KEYCODE_ENTER"],
                    capture_output=True, timeout=3,
                )
            except Exception:
                pass

        # ---- Wait for app to be fully in foreground (up to 10s) ----
        # This ensures the ART runtime has fully initialized before Frida attaches.
        print("[Sandbox] Waiting for app to settle in foreground...", flush=True)
        deadline = time.time() + 10
        app_ready = False
        while time.time() < deadline:
            try:
                # Check if the target app is the current foreground activity
                fg_check = subprocess.run(
                    ["adb", "shell", "dumpsys", "activity", "activities"],
                    capture_output=True, text=True, timeout=5,
                )
                if package_name in fg_check.stdout and "mResumedActivity" in fg_check.stdout:
                    # Also verify PID is still alive
                    pid_check = subprocess.run(
                        ["adb", "shell", "pidof", package_name],
                        capture_output=True, text=True, timeout=5,
                    )
                    pid_str = pid_check.stdout.strip()
                    if pid_str:
                        pid = int(pid_str.split()[0])
                        app_ready = True
                        break
            except Exception:
                pass
            time.sleep(1)

        if not app_ready:
            # Fallback: just check PID
            try:
                check = subprocess.run(
                    ["adb", "shell", "pidof", package_name],
                    capture_output=True, text=True, timeout=5,
                )
                pid_str = check.stdout.strip()
                if pid_str:
                    pid = int(pid_str.split()[0])
                    print(f"[Sandbox] App running with PID {pid} (activity check inconclusive)", flush=True)
                else:
                    # Try relaunching
                    print("[Sandbox] App process lost — relaunching...", flush=True)
                    pid = self.launch_app(package_name)
                    if pid is None:
                        raise frida.ProcessNotFoundError(f"Process {package_name} not found after relaunch")
                    time.sleep(3)
                    # Dismiss dialogs again
                    for _ in range(3):
                        subprocess.run(
                            ["adb", "shell", "input", "keyevent", "KEYCODE_ENTER"],
                            capture_output=True, timeout=3,
                        )
                        time.sleep(0.5)
            except frida.ProcessNotFoundError:
                raise
            except Exception:
                pass
        else:
            print(f"[Sandbox] App running with PID {pid} after dialog dismissal", flush=True)

        # ---- Extra settle time for ART VM ----
        # The Java VM needs a moment after the activity resumes to be fully
        # ready for Frida hook injection.
        time.sleep(2)

        # ---- Verify PID is alive right before attach ----
        try:
            check = subprocess.run(
                ["adb", "shell", "pidof", package_name],
                capture_output=True, text=True, timeout=5,
            )
            pid_str = check.stdout.strip()
            if pid_str:
                pid = int(pid_str.split()[0])
            else:
                raise frida.ProcessNotFoundError(f"PID for {package_name} disappeared before Frida attach")
        except frida.ProcessNotFoundError:
            raise
        except Exception:
            pass

        # Attach Frida
        print(f"[Sandbox] Attaching Frida to PID {pid}...", flush=True)
        session = self.device.attach(pid)
        print(f"[Sandbox] Attached to PID {pid}", flush=True)

        # Load hooks — Java VM is already running so hooks should inject immediately
        script_code = self._load_hooks_script()
        script = session.create_script(script_code, runtime="v8")
        script.on('message', self.on_frida_message)
        script.load()

        # Wait briefly for Java hooks to confirm
        time.sleep(3)
        for log_line in self.dynamic_logs[-5:]:
            if "Frida hooks injected successfully" in log_line:
                print("[Sandbox] Java hooks confirmed active!", flush=True)
                break

        return session

if __name__ == "__main__":
    # Test script standalone
    orchestrator = SandboxOrchestrator()
    if orchestrator.check_emulator():
        print("Emulator is ready.")
        orchestrator.ensure_frida_server()
    else:
        print("Please start an Android emulator and ensure adb is available.")
