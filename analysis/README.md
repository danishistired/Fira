# Fira analysis backend

The Flask service at port `5050` accepts APK uploads and streams investigation
progress through server-sent events. The analysis combines:

- Androguard manifest parsing and other static evidence
- JADX source decompilation and Apktool resource decoding
- LLM-guided Android emulator exploration through ADB/UIAutomator
- Concurrent Frida instrumentation, logcat, screenshots, and network capture
- Optional VirusTotal and MobSF enrichment

The Android emulator is central to dynamic analysis. It runs on the host and the
backend reaches its ADB server over TCP. MobSF is optional and is not required
for emulator exploration.

## Docker

From the repository root:

```sh
docker compose up --build -d analysis
```

Compose builds using `analysis/Dockerfile` and the repository root context.
The image installs Python dependencies (including Androguard), Java, ADB,
JADX, and Apktool. Database and uploaded artifacts are persisted in the
`argus_data` volume.

Start a rootable Android AVD on the Docker host and make the host ADB server
reachable to the container:

```sh
adb -a start-server
adb devices
```

See the root [deployment guide](../DEPLOYMENT.txt) for Docker Hub, AWS/KVM,
ADB firewall, frontend API URL, and optional MobSF instructions.

The `/health` endpoint reports backend, LLM, and database status.
