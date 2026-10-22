# Argus Eye Guard — Master Roadmap

> **Supersedes** `phases.md`.
> Written against the *actual* runtime state of the codebase as of 2026-08.
> Status labels: ✅ Done · 🔶 Partial · ⬜ Not Started

---

## Quick Summary of Where Things Stand

| Phase | Title | Status |
|-------|-------|--------|
| 1 | Foundation & Static Analysis Core | ✅ Done |
| 2 | Dynamic Analysis & Sandboxing | 🔶 Partial |
| 3 | Backend Persistence & Job State | ⬜ Not Started |
| 4 | Frontend as a Real Product Surface | 🔶 Partial |
| 5 | Agentic Engine Hardening | 🔶 Partial |
| 6 | ML Classification Pipeline | ⬜ Not Started |
| 7 | Threat Intelligence & RAG Depth | 🔶 Partial |
| 8 | Knowledge Graph & Structured Export | ⬜ Not Started |
| 9 | Case Management & Analyst Workflow | ⬜ Not Started |
| 10 | Enterprise Hardening & Scale | ⬜ Not Started |

---

## Phase 1 — Foundation & Static Analysis Core
**Status: ✅ Done**

This phase is the bedrock. It is complete.

### What was delivered
- Project scaffolding: FastAPI backend (`analysis/`), Vite/React frontend (`src/`), Docker packaging.
- APK upload endpoint with SSE progress streaming.
- OSINT triage at upload time (VirusTotal, MalwareBazaar lookups).
- AndroidManifest extraction and permission enumeration.
- Static analysis via JADX (decompilation to Java/Smali) and APKTool (resource unpacking).
- Initial permission-based risk scoring heuristics.
- YARA rule emission for detected IOCs.
- `orchestrator.py` + `planner.py` core loop: plan → tool call → observe → re-plan.
- DeepSeek-backed reasoning for verdict generation.
- MITRE ATT&CK RAG lookup (ChromaDB vector store).
- VirusTotal and MalwareBazaar API integrations live in the runtime path.
- Single functional frontend page (`_argus.index.tsx`) with upload flow, SSE progress, and result display.

### Success criteria (already met)
- An APK can be uploaded, fully analyzed, and a verdict produced end-to-end without manual intervention.
- OSINT results, manifest data, static findings, and a final risk score are all returned to the UI.

---

## Phase 2 — Dynamic Analysis & Sandboxing (Deepen)
**Status: 🔶 Partial — Frida/logcat/monkey/screenshot hooks exist; MobSF, network capture, and syscall forensics are missing from the runtime path.**

### Scope
Close the gap between "hooks exist" and "full dynamic provenance." The current Frida tooling fires hooks and emits events the orchestrator can observe, but there is no structured capture of network flows or system-call sequences, and MobSF is listed in requirements but not wired into the analysis path.

### Deliverables

#### 2.1 MobSF Integration
- Spin up MobSF as a Docker service in `docker-compose.yml`.
- Add a `mobsf_tool.py` that submits the APK, polls for completion, and ingests the JSON report.
- Feed MobSF findings (API abuse, certificate issues, hardcoded secrets) into the evidence correlator.

#### 2.2 Network Traffic Capture
- Run `tcpdump` or `mitmproxy` alongside the emulator session during dynamic analysis.
- Parse captured flows: extract domains, IPs, HTTP hosts, TLS SNI, DNS queries.
- Emit network-traffic evidence objects with timestamps so the correlator can reason about C2 beaconing patterns.

#### 2.3 System-Call Forensics
- Hook `strace` / Frida's `Interceptor` on critical syscalls (`open`, `connect`, `execve`, `ptrace`).
- Emit structured syscall events (timestamp, pid, call name, args) into the evidence stream.
- Add a syscall-sequence analyzer that flags known evasion patterns (ptrace anti-debug, dynamic code loading).

#### 2.4 Emulator Lifecycle Management
- Proper AVD start/stop around each dynamic run so analysis is reproducible and isolated.
- Timeout and resource guard so a misbehaving APK cannot block the analysis queue.

### Success criteria
- Network flows and syscall traces appear in the final evidence object.
- MobSF findings are reflected in the verdict.
- A test APK with known C2 traffic triggers a C2-related MITRE technique mapping.

---

## Phase 3 — Backend Persistence & Job State
**Status: ⬜ Not Started**

### Why this is urgent
Right now, every analysis run is ephemeral. If the backend restarts mid-analysis, all state is lost. The frontend compensates with localStorage, which is fragile and not shareable. Without persistence, none of the downstream phases (case management, multi-sample clustering, audit trails) can be built.

### Scope
Introduce a lightweight but real persistence layer so jobs, findings, and evidence are durable.

### Deliverables

#### 3.1 Database Schema
- Choose SQLite (local/dev) with SQLAlchemy, with a migration path to PostgreSQL for production.
- Tables: `jobs`, `findings`, `evidence_items`, `verdicts`, `yara_rules`, `analyst_notes`.
- Job lifecycle states: `queued → running → done | failed | timeout`.

#### 3.2 Job Queue
- Replace the current fire-and-forget flow with a proper job queue (Celery + Redis, or a simpler APScheduler setup for solo deployments).
- Jobs are enqueued on upload; a worker picks them up; SSE streams from job status, not from in-memory state.

#### 3.3 REST API Layer for Stored Results
- `GET /jobs` — list all jobs with status, timestamps, risk score.
- `GET /jobs/{id}` — full result including all evidence, verdict, YARA.
- `DELETE /jobs/{id}` — soft-delete with audit log entry.
- `GET /jobs/{id}/evidence` — paginated evidence items.
- `GET /jobs/{id}/yara` — download generated YARA rule file.

#### 3.4 Artifact Storage
- Store decompiled output, captured network logs, and screenshots on disk with paths recorded in the DB.
- Provide a `GET /jobs/{id}/artifacts/{filename}` endpoint for UI download.

### Success criteria
- Backend restart mid-analysis does not lose the job; it resumes or at minimum the partial results survive.
- Two browser tabs opened to the same job ID show identical state without localStorage tricks.

---

## Phase 4 — Frontend as a Real Product Surface
**Status: ✅ Done**

### Scope
Either restore the disabled pages as real, data-backed views or remove them cleanly. The UI must match the actual backend capabilities at every route.

### Deliverables

#### 4.1 Navigation Audit
- Audit `_argus.agents.tsx`, `_argus.reports.tsx`, `_argus.knowledge-graph.tsx`, `_argus.threat-map.tsx`, `_argus.submissions.tsx`, `_argus.settings.tsx`.
- Decision: restore or remove each route. No dead-end placeholder pages in a production product.

#### 4.2 Jobs / Submissions Dashboard (`_argus.submissions.tsx`)
- Restore as a real job-list view backed by `GET /jobs`.
- Columns: filename, submitted-at, status, risk score, quick-action buttons (view, delete, download report).
- Status badges with live refresh via polling or SSE.

#### 4.3 Reports Page (`_argus.reports.tsx`)
- Per-job report view: verdict summary card, evidence timeline (see Phase 9), MITRE heatmap, YARA download button.
- HTML and PDF export (using browser `window.print()` or a server-side renderer like WeasyPrint).

#### 4.4 Settings Page (`_argus.settings.tsx`)
- API key management for VirusTotal, MalwareBazaar, DeepSeek (stored server-side, never returned to client).
- Model routing toggle: DeepSeek cloud vs. local Ollama/vLLM endpoint (Phase 5 prerequisite).
- JADX/APKTool path configuration for self-hosted installs.

#### 4.5 WebSocket Real-Time Layer
- Replace or supplement SSE with a WebSocket channel for the agent thought-stream.
- Stream individual agent steps — tool calls, observations, re-plan decisions — to the UI so the analyst can watch the engine think.
- Show a live "agent log" panel on the analysis page.

#### 4.6 Design Polish
- Unify component library across all restored pages.
- Add skeleton loaders, error boundaries, and empty states everywhere.
- Ensure mobile-responsive layout.

### Success criteria
- All navigation routes either show real data or are entirely removed from the nav.
- A second analyst can open the app and immediately understand the state of all past analyses.
- PDF export of a completed analysis works in one click.

---

## Phase 5 — Agentic Engine Hardening
**Status: 🔶 Partial — Planner/orchestrator loop works; schema validation, retry caps, adversarial consensus, and test coverage are absent.**

### Scope
Make the agentic core production-grade: correct, bounded, observable, and testable.

### Deliverables

#### 5.1 Schema Validation on Tool I/O
- Define Pydantic models for every tool's input and output.
- The orchestrator validates tool call arguments before execution and parses tool output against the schema before feeding it to the planner.
- Malformed tool output triggers a structured error event, not an unhandled exception.

#### 5.2 Retry Budget & Circuit Breaker
- Per-tool retry caps (e.g., max 3 retries for JADX, max 2 for VirusTotal).
- Global plan-step cap: the orchestrator stops planning after N steps and emits a partial verdict rather than looping forever.
- Circuit breaker for external APIs: if VirusTotal returns 429s, disable it for the rest of the run and log the degradation.

#### 5.3 Multi-Model Routing
- Abstract the LLM call behind a `ModelRouter` class.
- Support: DeepSeek API, local Ollama endpoint, local vLLM endpoint.
- Model selection is configurable per-environment via env var or the settings page toggle.
- Sensitive/offline deployments can run entirely on local models.

#### 5.4 Adversarial Consensus (Lightweight)
- Two-pass approach: a **prosecutor pass** (assume malicious, find evidence) and a **defender pass** (assume benign, challenge each finding).
- Verdict is synthesized from both passes with a confidence score.
- Pragmatic replacement for a full six-agent LangGraph setup — same adversarial value, far less complexity.

#### 5.5 Correlation Engine Tests
- Unit tests for `evidence.py` correlation logic.
- Unit tests for `planner.py` tool-selection decisions.
- Integration test: upload `InsecureBankv2.apk`, assert verdict contains at least one high-severity finding mapped to a MITRE technique.

#### 5.6 Structured Thought Logging
- Each planner decision is logged as a structured JSON event to the DB (job_id, step, reasoning, tool_selected, confidence).
- Feeds the agent log panel in Phase 4.5 and the evidence timeline in Phase 9.

### Success criteria
- No analysis run can loop indefinitely regardless of LLM output.
- `pytest` suite passes on a fresh clone with mocked external APIs.
- Adversarial consensus demonstrably changes the verdict on at least one test APK vs. single-pass reasoning.

---

## Phase 6 — ML Classification Pipeline
**Status: ⬜ Not Started — Dependencies exist in requirements.txt but no training/inference code is in the active runtime path.**

### Scope
Build and integrate an actual trained-model layer for risk classification. Additive to the agentic reasoning — the model gives a fast, deterministic prior; the agents provide depth and explainability.

### Deliverables

#### 6.1 Feature Extraction
- Static features: permission count/types, API call histogram, string entropy, DEX class count, native library presence.
- Dynamic features (Phase 2 prerequisite): network connection count, syscall frequency vector, Frida hook hit counts.
- Emit a structured feature vector as part of every completed analysis.

#### 6.2 Dataset Curation
- Download a labeled APK dataset (Drebin, AndroZoo subset, MalwareBazaar samples).
- Script for bulk feature extraction from the dataset using the same pipeline.
- Split into train/val/test; document class imbalance and mitigation strategy.

#### 6.3 Model Training
- Train XGBoost and Random Forest classifiers on the extracted features.
- Hyperparameter search with cross-validation.
- Serialize trained models to `analysis/models/`.
- Document training metrics (AUC, F1, precision, recall at chosen threshold).

#### 6.4 Inference Integration
- On every analysis run, load the trained model and score the feature vector.
- Emit `ml_score` and `ml_confidence` into the evidence stream.
- The orchestrator uses `ml_score` as an additional signal when forming the verdict.

#### 6.5 SHAP Explainability
- After inference, compute SHAP values for the top contributing features.
- Surface the top features in the verdict explanation: "The ML model flagged this APK primarily due to [SEND_SMS + crypto APIs + high string entropy]."

#### 6.6 Model Versioning & Refresh
- Track model version in the DB alongside each verdict.
- Analyst feedback (Phase 9) can be used to periodically retrain.

### Success criteria
- The ML score is present in every completed analysis result.
- SHAP explanations are human-readable and non-redundant with agent reasoning.
- Model AUC ≥ 0.90 on held-out test set.

---

## Phase 7 — Threat Intelligence & RAG Depth
**Status: 🔶 Partial — MITRE ATT&CK RAG, VirusTotal, MalwareBazaar, and YARA are live. DroidTTP and Sigma generation are missing.**

### Scope
Deepen the threat intelligence layer: more sources, better retrieval quality, and full rule generation.

### Deliverables

#### 7.1 DroidTTP Integration
- Ingest DroidTTP dataset into the ChromaDB vector store alongside MITRE ATT&CK.
- Tag retrieved chunks with source (`MITRE` vs. `DroidTTP`) so the agent can reason about provenance.
- Validate that Android-specific TTP patterns (accessibility service abuse, overlay attacks) are retrievable.

#### 7.2 Retrieval Quality Improvements
- Hybrid retrieval: BM25 keyword match + dense embedding re-rank.
- Relevance score threshold: don't inject RAG context below a minimum similarity score.
- Log retrieval queries and retrieved chunks per job for debugging.

#### 7.3 Sigma Rule Generation
- After finding a confirmed behavioral pattern, generate a Sigma rule (YAML format) targeting the detected behavior.
- Rules are stored in the DB, displayed in the report, and downloadable.

#### 7.4 Additional TI Feeds
- Integrate AlienVault OTX for reputation lookups on extracted domains/IPs.
- Add optional Shodan lookup for C2 infrastructure enrichment.
- All external TI calls are guarded by the circuit breaker from Phase 5.2.

#### 7.5 IOC Export
- Structured IOC export per job: IPs, domains, hashes, certificates, package names.
- Formats: JSON (flat list), STIX 2.1 Bundle (Phase 8), CSV for SIEM ingestion.

### Success criteria
- DroidTTP-specific techniques appear in verdicts for APKs exhibiting Android-specific attack patterns.
- Sigma rules generated for confirmed findings parse correctly with the `sigma` CLI tool.
- OTX lookups enrich domain/IP extraction results.

---

## Phase 8 — Knowledge Graph & Structured Export
**Status: ⬜ Not Started — Neo4j, STIX 2.1 export, and relationship modeling are entirely absent from the runtime.**

### Scope
Model the relationships between findings, behaviors, indicators, and threat actors in a graph structure. Enable STIX/TAXII export for integration with external platforms.

### Deliverables

#### 8.1 Neo4j Setup
- Add Neo4j to `docker-compose.yml` as a service.
- Graph schema: nodes (`APK`, `Permission`, `APICall`, `NetworkFlow`, `ThreatActor`, `Technique`, `Indicator`), edges (`USES`, `COMMUNICATES_WITH`, `MAPS_TO`, `BELONGS_TO`).

#### 8.2 Graph Population
- After each analysis, write nodes and edges to Neo4j from the evidence and verdict.
- Wire the existing `_argus.knowledge-graph.tsx` page to query and visualize the graph.

#### 8.3 Cross-Sample Correlation
- Query the graph to find APKs sharing the same C2 domain, certificate, or code pattern — foundation for family clustering (Phase 9).
- Surface "related samples" in the per-job report.

#### 8.4 STIX 2.1 Export
- Map the evidence model to STIX 2.1 objects: `Malware`, `Indicator`, `AttackPattern`, `Infrastructure`.
- `GET /jobs/{id}/stix` returns a STIX 2.1 Bundle JSON.
- Optional TAXII 2.1 server endpoint for push to external TIPs.

#### 8.5 Threat Map
- Wire the existing `_argus.threat-map.tsx` page to display a live geo-map of extracted C2 IPs (IP geolocation).
- Connect to Neo4j graph for network-layer data.

### Success criteria
- Analyzing two APKs from the same malware family shows a "related samples" link in the graph.
- The STIX export for a completed job parses correctly with the `stix2` Python library.
- The threat map renders at least one geolocation point for an APK with network activity.

---

## Phase 9 — Case Management & Analyst Workflow
**Status: ⬜ Not Started**

### Scope
Transform Argus from a single-run analysis tool into a true investigation platform. Analysts should be able to manage cases, annotate findings, replay dynamic analysis timelines, and provide feedback that improves the system.

### Deliverables

#### 9.1 Case Layer
- A `Case` is a named investigation containing one or more `Job`s (APK analyses).
- `POST /cases` — create a case.
- `POST /cases/{id}/jobs` — add a job to a case.
- Cases have status (open, pending, closed), assignee, and severity.

#### 9.2 Multi-Sample Family Clustering
- Group jobs in the same case by code similarity (SimHash on DEX), shared indicators, and graph proximity.
- Surface cluster labels in the case view: "5 of 7 samples share a common dropper."

#### 9.3 Evidence Timeline Replay
- Every evidence event (Frida hook, network flow, syscall, screenshot) has a monotonic timestamp.
- The UI renders a scrubber timeline: the analyst can move forward/backward through the dynamic analysis session.
- Screenshots are shown inline at the timestamp they were captured.

#### 9.4 Analyst Annotations & Feedback Loop
- Analysts can annotate findings: confirm, dismiss, escalate, or relabel severity.
- Dismissed false positives are stored and fed back to the ML training pipeline (Phase 6.6) as negative examples.
- Confirmed true positives increase feature importance weights.

#### 9.5 Notification & Assignment
- Email or webhook notification when a high-severity verdict is produced.
- Assign cases to team members (requires minimal auth: API key per analyst or simple role-based JWT).

#### 9.6 Downloadable Reports
- HTML report (self-contained, no external assets) — generated server-side.
- PDF export via server-side WeasyPrint or headless Chrome.
- Report includes: verdict card, evidence timeline, MITRE heatmap, SHAP feature chart, IOC table, YARA/Sigma rules.

### Success criteria
- An analyst can open a case, see all related APK analyses side-by-side, annotate findings, and download a PDF report in one workflow.
- Feedback events are recorded in the DB and visible in the model retraining audit log.
- Evidence timeline plays back correctly for a dynamic analysis run with at least 20 events.

---

## Phase 10 — Enterprise Hardening & Scale
**Status: ⬜ Not Started**

### Scope
Prepare Argus for regulated, multi-tenant, or high-throughput deployments. This phase is intentionally last because earlier phases establish the data model and operational patterns that hardening builds on.

### Deliverables

#### 10.1 Authentication & Authorization
- JWT-based auth with role hierarchy: Admin, Analyst, Read-Only.
- API key management for programmatic access (CI/CD pipelines submitting APKs).
- All endpoints require authentication; public demo mode is opt-in.

#### 10.2 Audit Trail
- Immutable append-only log of every action: who submitted what APK, when, what verdict was produced, who annotated it.
- Audit log is queryable via `GET /audit` with filters.
- Supports compliance requirements (SOC 2, ISO 27001 basic control mapping).

#### 10.3 Multi-Tenancy
- Namespace all data by `organization_id`.
- Analysts in org A cannot see data from org B.
- Tenant-level API key and model routing configuration.

#### 10.4 Full Docker Orchestration
- Current `docker-compose.yml` only brings up the analysis service. Expand to include:
  - `argus-backend` (FastAPI)
  - `argus-worker` (Celery worker for analysis jobs)
  - `redis` (job queue broker)
  - `postgres` (production DB)
  - `neo4j` (knowledge graph)
  - `mobsf` (dynamic analysis sandbox)
  - `chromadb` (vector store)
  - `argus-frontend` (Nginx-served React build)
- Provide a `docker-compose.prod.yml` with resource limits, restart policies, and secrets management.

#### 10.5 Performance & Throughput
- Analysis jobs run in parallel up to `MAX_WORKERS` (configurable).
- Long static analysis steps (JADX decompile) run in a process pool to avoid blocking the event loop.
- Caching: VirusTotal/MalwareBazaar results cached per hash to avoid redundant API calls.
- CDN-ready frontend build with content hashing.

#### 10.6 Federated Learning (Optional / Research Track)
- Analyst feedback from multiple deployments can be aggregated (with consent) to retrain the ML model.
- Privacy-preserving: only gradient updates, not raw sample data, are shared.
- Gate behind a feature flag; deferred until Phase 9 feedback loop is mature.

#### 10.7 Monitoring & Observability
- Structured JSON logging throughout the backend (replace any `print()` statements).
- Prometheus metrics endpoint: job queue depth, analysis latency p50/p95, tool error rate, model inference latency.
- Grafana dashboard template for self-hosted monitoring.
- Sentry integration for exception tracking.

### Success criteria
- A fresh deployment from `docker-compose up` produces a fully functional system with all services healthy.
- 10 simultaneous APK analyses complete without errors or resource starvation.
- Audit log captures all analyst actions with tamper-evident timestamps.
- All API endpoints return 401 for unauthenticated requests.

---

## Phase Dependencies & Recommended Order

```
Phase 1 (Done)
    ├── Phase 2  (Dynamic Analysis Depth)
    └── Phase 3  (Persistence)  ← HIGHEST PRIORITY NEXT STEP
            ├── Phase 4  (Frontend)
            └── Phase 5  (Agentic Hardening)
                    ├── Phase 6  (ML Pipeline)       ← needs Phase 2 for dynamic features
                    └── Phase 7  (TI & RAG Depth)
                            └── Phase 8  (Knowledge Graph & Export)
                                    └── Phase 9  (Case Management)
                                            └── Phase 10  (Enterprise)
```

**Pragmatic next three milestones:**
1. **Phase 3** — Persistence (unblocks everything else)
2. **Phase 4** — Frontend (makes the tool usable day-to-day)
3. **Phase 5** — Agentic hardening (makes the core reliable enough to trust)

---

## What Is Intentionally Out of Scope

- **LangGraph** — The current custom planner/orchestrator is simpler, more debuggable, and already works. LangGraph adds overhead without proportional benefit at this stage.
- **Six independent debating agents** — Replaced by the two-pass prosecutor/defender in Phase 5. Same adversarial value, far less complexity.
- **Full TAXII server** — The STIX bundle export in Phase 8 covers 90% of the integration need. A full TAXII server is only worth adding if a specific TIP integration requires it.
- **Real-time D3 graph animations** — Useful polish, but secondary to getting the data flowing correctly first.

---

*Last updated: 2026-08-01*
