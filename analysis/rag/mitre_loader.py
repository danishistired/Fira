"""
MITRE ATT&CK Mobile Matrix loader for ARGUS RAG.

Downloads the MITRE ATT&CK Mobile matrix JSON from MITRE's STIX feed
and ingests it into the ChromaDB collection on first run.

Each technique is stored as:
  - document: "{technique_id}: {name} — {description}"
  - metadata: {technique_id, name, tactic, platforms, url}

ChromaDB's built-in embedding function (all-MiniLM-L6-v2 via sentence-transformers)
is used for vectorisation — no additional embedding service required.

The load is skipped if the collection is already populated.
"""

import json
import os
import time
from pathlib import Path
from typing import Optional

# MITRE ATT&CK Mobile STIX bundle (official source)
MITRE_MOBILE_URL = (
    "https://raw.githubusercontent.com/mitre/cti/master/"
    "mobile-attack/mobile-attack.json"
)

# Fallback: compact technique list for offline use
# (used if download fails and no cached file exists)
_FALLBACK_TECHNIQUES = [
    {"id": "T1437", "name": "Application Layer Protocol", "tactic": "Command and Control",
     "desc": "Adversaries may communicate using application layer protocols to avoid detection/network filtering."},
    {"id": "T1407", "name": "Download New Code at Runtime", "tactic": "Defense Evasion",
     "desc": "Adversaries may attempt to download and execute code at runtime including DexClassLoader usage."},
    {"id": "T1406", "name": "Obfuscated Files or Information", "tactic": "Defense Evasion",
     "desc": "Adversaries may attempt to make payloads difficult to discover or analyze by obfuscating content."},
    {"id": "T1412", "name": "Capture SMS Messages", "tactic": "Collection",
     "desc": "Adversaries may capture SMS messages to obtain authentication codes or intercept OTPs."},
    {"id": "T1422", "name": "System Network Configuration Discovery", "tactic": "Discovery",
     "desc": "Adversaries may look for details about the network configuration of a device."},
    {"id": "T1417", "name": "Input Capture", "tactic": "Collection",
     "desc": "Adversaries may capture user input to obtain credentials or collect information."},
    {"id": "T1453", "name": "Abuse Elevation Control Mechanism", "tactic": "Privilege Escalation",
     "desc": "Adversaries may circumvent mechanisms designed to control elevated privileges including AccessibilityService."},
    {"id": "T1404", "name": "Exploit OS Vulnerability", "tactic": "Privilege Escalation",
     "desc": "Adversaries may exploit OS vulnerabilities to gain code execution with elevated privileges."},
    {"id": "T1418", "name": "Software Discovery", "tactic": "Discovery",
     "desc": "Adversaries may attempt to get a listing of installed apps on the device."},
    {"id": "T1432", "name": "Access Contact List", "tactic": "Collection",
     "desc": "Adversaries may call phone APIs to gather contact list data."},
    {"id": "T1433", "name": "Access Call Log", "tactic": "Collection",
     "desc": "Adversaries may utilize the phone's call log to get information about calls."},
    {"id": "T1430", "name": "Location Tracking", "tactic": "Collection",
     "desc": "Adversaries may use standard operating system APIs to gather device location."},
    {"id": "T1429", "name": "Capture Audio", "tactic": "Collection",
     "desc": "Adversaries may capture audio, including the microphone, of the device."},
    {"id": "T1428", "name": "Exploitation of Remote Services", "tactic": "Lateral Movement",
     "desc": "Adversaries may exploit remote services of enterprise servers, workstations, or other resources."},
    {"id": "T1426", "name": "System Information Discovery", "tactic": "Discovery",
     "desc": "Adversaries may attempt to get detailed information about the operating system and hardware."},
    {"id": "T1424", "name": "Process Discovery", "tactic": "Discovery",
     "desc": "Adversaries may attempt to get information about running processes on a device."},
    {"id": "T1409", "name": "Access Stored Application Data", "tactic": "Collection",
     "desc": "Adversaries may attempt to read data stored by other applications."},
    {"id": "T1420", "name": "File and Directory Discovery", "tactic": "Discovery",
     "desc": "Adversaries may enumerate files and directories or search for specific file locations."},
    {"id": "T1438", "name": "Adversary-in-the-Middle", "tactic": "Collection",
     "desc": "Adversaries may use AiTM techniques to intercept network communications."},
    {"id": "T1444", "name": "Masquerade as Legitimate Application", "tactic": "Defense Evasion",
     "desc": "Adversaries may attempt to make their malicious application appear legitimate."},
]


def _parse_stix_bundle(bundle: dict) -> list[dict]:
    """Extract technique records from a STIX 2.1 bundle."""
    techniques = []
    objects = bundle.get("objects", [])

    # Build tactic name lookup from x-mitre-tactic objects
    tactic_map = {}
    for obj in objects:
        if obj.get("type") == "x-mitre-tactic":
            tactic_map[obj.get("x_mitre_shortname", "")] = obj.get("name", "")

    for obj in objects:
        if obj.get("type") != "attack-pattern":
            continue
        if obj.get("x_mitre_deprecated", False) or obj.get("revoked", False):
            continue

        ext = obj.get("x_mitre_domains", [])
        if "mobile-attack" not in ext:
            continue

        technique_id = ""
        for ref in obj.get("external_references", []):
            if ref.get("source_name") == "mitre-attack":
                technique_id = ref.get("external_id", "")
                break

        if not technique_id or technique_id.startswith("T1"):
            pass  # keep all T1xxx techniques
        else:
            continue

        # Extract tactic phases
        phases = obj.get("kill_chain_phases", [])
        tactic_names = []
        for p in phases:
            short = p.get("phase_name", "")
            tactic_names.append(tactic_map.get(short, short.replace("-", " ").title()))

        desc = obj.get("description", "")[:500]  # truncate for token efficiency
        platforms = obj.get("x_mitre_platforms", [])

        techniques.append({
            "id": technique_id,
            "name": obj.get("name", ""),
            "tactic": ", ".join(tactic_names) if tactic_names else "unknown",
            "desc": desc,
            "platforms": platforms,
        })

    return techniques


def load_mitre_into_chroma(force: bool = False) -> int:
    """Download and embed MITRE ATT&CK Mobile techniques into ChromaDB.

    Returns the number of techniques loaded (0 if skipped).
    """
    from rag.chroma_store import get_collection, is_populated

    collection = get_collection()
    if collection is None:
        print("[MITRE Loader] ChromaDB not available — skipping RAG load", flush=True)
        return 0

    if is_populated() and not force:
        count = collection.count()
        print(f"[MITRE Loader] Collection already populated ({count} techniques) — skipping", flush=True)
        return 0

    # Try to download the STIX bundle
    techniques = []
    cache_path = Path(__file__).parent / "mobile_attack_cache.json"

    if cache_path.exists():
        print("[MITRE Loader] Loading from local cache...", flush=True)
        with open(cache_path, "r", encoding="utf-8") as f:
            techniques = json.load(f)
    else:
        print("[MITRE Loader] Downloading MITRE ATT&CK Mobile matrix...", flush=True)
        try:
            import requests
            resp = requests.get(MITRE_MOBILE_URL, timeout=30)
            if resp.status_code == 200:
                bundle = resp.json()
                techniques = _parse_stix_bundle(bundle)
                # Cache for future runs
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump(techniques, f)
                print(f"[MITRE Loader] Downloaded and parsed {len(techniques)} techniques", flush=True)
            else:
                print(f"[MITRE Loader] Download failed ({resp.status_code}) — using fallback", flush=True)
                techniques = _FALLBACK_TECHNIQUES
        except Exception as e:
            print(f"[MITRE Loader] Download error: {e} — using fallback", flush=True)
            techniques = _FALLBACK_TECHNIQUES

    if not techniques:
        techniques = _FALLBACK_TECHNIQUES

    # Embed into ChromaDB in batches
    print(f"[MITRE Loader] Embedding {len(techniques)} techniques into ChromaDB...", flush=True)
    batch_size = 50
    loaded = 0

    for i in range(0, len(techniques), batch_size):
        batch = techniques[i : i + batch_size]
        ids = [f"{t['id']}" for t in batch]
        documents = [
            f"{t['id']}: {t['name']} ({t['tactic']}) — {t['desc']}"
            for t in batch
        ]
        metadatas = [
            {
                "technique_id": t["id"],
                "name": t["name"],
                "tactic": t["tactic"],
            }
            for t in batch
        ]

        collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
        loaded += len(batch)

    print(f"[MITRE Loader] Done — {loaded} techniques in ChromaDB", flush=True)
    return loaded
