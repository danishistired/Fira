import os
import subprocess
import time
import frida
import threading

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
        """Launch the app using ADB monkey."""
        print(f"[Sandbox] Launching {package_name}...")
        try:
            # monkey -p <pkg> -c android.intent.category.LAUNCHER 1
            subprocess.run(
                ["adb", "shell", "monkey", "-p", package_name, "-c", "android.intent.category.LAUNCHER", "1"],
                capture_output=True, timeout=10
            )
            time.sleep(2) # Give it a moment to start
        except Exception as e:
            print(f"[Sandbox] Launch failed: {e}")

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

    def run_dynamic_analysis(self, package_name, apk_path, duration_seconds=30):
        """Orchestrates the dynamic analysis phase."""
        self.dynamic_logs = []
        
        if not self.check_emulator():
            return {"success": False, "error": "No emulator connected", "logs": []}

        # 1. Install
        if not self.install_apk(apk_path):
            return {"success": False, "error": "Failed to install APK", "logs": []}

        # 2. Launch
        self.launch_app(package_name)

        # 3. Attach Frida
        session = None
        try:
            print("[Sandbox] Attaching Frida...")
            self.device = frida.get_usb_device(timeout=5)
            # Find the PID of the package
            pid = self.device.get_process(package_name).pid
            session = self.device.attach(pid)
            
            # 4. Load Hooks
            hooks_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hooks.js')
            with open(hooks_path, 'r') as f:
                script_code = f.read()
                
            script = session.create_script(script_code)
            script.on('message', self.on_frida_message)
            script.load()
            
            print(f"[Sandbox] Monitoring {package_name} for {duration_seconds} seconds...")
            # 5. Wait for events
            time.sleep(duration_seconds)
            
        except frida.ProcessNotFoundError:
             print("[Sandbox] Frida could not find the running process. The app might have crashed or exited immediately.")
             self.dynamic_logs.append("Frida: Process exited or crashed before attachment.")
        except Exception as e:
            print(f"[Sandbox] Frida Error: {e}")
            self.dynamic_logs.append(f"Sandbox Error: {e}")
        finally:
            # 6. Cleanup
            if session:
                try:
                    session.detach()
                except:
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
    else:
        print("Please start an Android emulator and ensure adb is available.")
