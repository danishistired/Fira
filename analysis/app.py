"""
ARGUS Backend — Flask API Routes

This is the slim entry point for the ARGUS backend. All analysis logic
has been moved to the agentic engine (engine/) and tool layer (tools/).

This file handles:
1. Flask setup and CORS
2. Database initialisation (Phase 3)
3. Artifact store initialisation (Phase 3)
4. File upload and temp file management
5. Delegating to InvestigationOrchestrator
6. The /chat follow-up endpoint
7. The /analyze endpoint (backward-compatible response shape)
8. REST endpoints for stored results (Phase 3):
   GET  /jobs
   GET  /jobs/<id>
   GET  /jobs/<id>/result
   GET  /jobs/<id>/evidence
   GET  /jobs/<id>/yara
   GET  /jobs/<id>/artifacts/<filename>
   DELETE /jobs/<id>

The 1633-line monolith has been decomposed into:
- analysis/shared/    → constants, scoring, evidence, language utilities
- analysis/tools/     → tool registry + 9 individual tool wrappers
- analysis/engine/    → orchestrator, planner, memory, prompts
- analysis/db/        → SQLAlchemy models, session, repository (Phase 3)
- analysis/storage/   → file-system artifact store (Phase 3)

The frontend sees the EXACT same streaming response JSON — no frontend changes needed.
The new REST endpoints are purely additive.
"""

import os
import sys
import tempfile
import json
import hashlib
import logging

from flask import Flask, request, jsonify, Response, stream_with_context, send_file, abort
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
import threading
import queue
import time

# ---------- Path Setup ----------
ANALYSIS_DIR = os.path.dirname(os.path.abspath(__file__))
if ANALYSIS_DIR not in sys.path:
    sys.path.insert(0, ANALYSIS_DIR)

# Load .env from the same directory as this script
load_dotenv(os.path.join(ANALYSIS_DIR, '.env'))

# Suppress androguard's extremely verbose DEBUG output
logging.getLogger('androguard').setLevel(logging.WARNING)

from engine.orchestrator import InvestigationOrchestrator
from engine.dynamic_only_orchestrator import DynamicOnlyOrchestrator
from engine.autonomous_orchestrator import AutonomousOrchestrator
from tools.registry import ToolRegistry
from shared.language import enforce_language_rules, log_llm_prompt
from shared.constants import ARGUS_TEMP_DIR
from pathlib import Path

# ---------- Phase 3: DB + Artifact Store ----------
from db import init_db
from db.repository import (
    create_job, update_job_status, update_job_result,
    add_evidence_items, save_yara_rule, save_artifact,
    get_job, list_jobs, get_evidence, get_yara, get_artifacts,
    soft_delete_job, count_jobs, _extract_evidence_items,
)
from storage import ArtifactStore

# Initialise database tables on startup
init_db()

# Initialise artifact store
artifact_store = ArtifactStore()

app = Flask(__name__)
CORS(app)

# ---------- Java / Tool Paths ----------
java_path = r"C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot\bin"
if os.path.exists(java_path) and java_path not in os.environ["PATH"]:
    os.environ["PATH"] = java_path + os.pathsep + os.environ["PATH"]

# ---------- DeepSeek LLM Client ----------
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
if DEEPSEEK_API_KEY:
    llm_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")
    print("[INIT] DeepSeek client initialized", flush=True)
else:
    llm_client = None
    print("[INIT] WARNING: No DEEPSEEK_API_KEY found, LLM features disabled", flush=True)

# ---------- Initialize Agentic Engine ----------
registry = ToolRegistry()
registry.auto_register()
orchestrator = InvestigationOrchestrator(llm_client, registry)
dynamic_orchestrator = DynamicOnlyOrchestrator(llm_client, registry)
autonomous_orchestrator = AutonomousOrchestrator(
    llm_client, registry, fallback_orchestrator=dynamic_orchestrator
)

print(f"[INIT] ARGUS agentic engine initialized with {len(registry.list_tool_names())} tools", flush=True)
print(f"[INIT] Available tools: {', '.join(registry.list_tool_names())}", flush=True)


# ---------- Helpers ----------

def _sha256_file(path: str) -> str:
    """Return SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# ============================================================
# ANALYSIS ROUTES (existing — enhanced with DB persistence)
# ============================================================

@app.route('/analyze', methods=['POST'])
def analyze_apk():
    """Analyze an uploaded APK file using the agentic investigation engine.

    The orchestrator dynamically decides which tools to run based on
    evidence accumulated during the investigation.

    Response shape is IDENTICAL to the old pipeline — frontend compatibility
    is preserved. The only new fields are investigation_timeline,
    investigation_iterations, investigation_coverage, and job_id.
    """
    print(f"\n{'='*60}", flush=True)
    print(f"[analyze_apk] REQUEST RECEIVED", flush=True)

    if 'file' not in request.files:
        return jsonify({'error': 'no file provided'}), 400

    f = request.files['file']
    print(f"[analyze_apk] filename={f.filename}", flush=True)

    if f.filename == '':
        return jsonify({'error': 'empty filename'}), 400

    # Save uploaded file to temp location
    tmp_fd, tmp_path = tempfile.mkstemp(suffix='.apk', dir=ARGUS_TEMP_DIR)
    os.close(tmp_fd)

    try:
        f.save(tmp_path)

        # -- Phase 3: create DB job record --
        file_hash = _sha256_file(tmp_path)
        job_id = create_job(filename=f.filename, file_hash=file_hash)
        update_job_status(job_id, "running")

        # -- Save original APK to artifact store --
        apk_dest = artifact_store.save_apk(job_id, tmp_path)
        if apk_dest:
            save_artifact(job_id, "apk", apk_dest,
                          file_size=artifact_store.get_file_size(apk_dest))

        # Delegate to the agentic orchestrator
        result = orchestrator.investigate(tmp_path)

        # -- Phase 3: persist result --
        update_job_result(job_id, result)
        evidence_items = _extract_evidence_items(result)
        add_evidence_items(job_id, evidence_items)

        # Persist YARA rule if generated
        if result.get("yara_rule"):
            save_yara_rule(job_id, result.get("yara_rule_name", "argus_detection"),
                           result["yara_rule"])
            yara_path = artifact_store.save_yara(job_id, result["yara_rule"])
            if yara_path:
                save_artifact(job_id, "yara_file", yara_path,
                              file_size=artifact_store.get_file_size(yara_path))

        result["job_id"] = job_id

        print(f"[analyze_apk] DONE — job_id={job_id} verdict={result.get('verdict', 'N/A')} "
              f"scope={result.get('analysis_scope', 'unknown')} "
              f"iterations={result.get('investigation_iterations', '?')}", flush=True)

        return jsonify(result)

    except Exception as e:
        print(f"[analyze_apk] ERROR: {type(e).__name__}: {e}", flush=True)
        import traceback
        traceback.print_exc()
        if 'job_id' in dir():
            update_job_status(job_id, "failed")
        return jsonify({'error': str(e)}), 500

    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass


@app.route('/analyze/stream', methods=['POST'])
def analyze_apk_stream():
    """Streaming SSE version of /analyze.

    Emits real-time progress events as the agentic investigation runs,
    then sends the final result as the last event.

    SSE event types emitted:
      status          — investigation phase change (includes job_id on first event)
      tool_start      — a tool is about to execute
      tool_done       — a tool finished executing
      planner_thinking — planner is calling the LLM
      planner_decision — planner chose next action with reasoning
      consensus_start — final verdict generation starting
      complete        — investigation done (data = full result JSON)
      error           — investigation failed
    """
    if 'file' not in request.files:
        return jsonify({'error': 'no file provided'}), 400
    f = request.files['file']
    if f.filename == '':
        return jsonify({'error': 'empty filename'}), 400

    # Read analysis mode from form data
    analysis_mode = request.form.get("mode", "full")  # 'full' or 'dynamic_only'

    # Save to temp file before streaming starts
    tmp_fd, tmp_path = tempfile.mkstemp(suffix='.apk', dir=ARGUS_TEMP_DIR)
    os.close(tmp_fd)
    f.save(tmp_path)

    # -- Phase 3: create DB job record immediately --
    try:
        file_hash = _sha256_file(tmp_path)
    except Exception:
        file_hash = None
    job_id = create_job(filename=f.filename, file_hash=file_hash)

    # -- Save original APK to artifact store --
    apk_dest = artifact_store.save_apk(job_id, tmp_path)
    if apk_dest:
        save_artifact(job_id, "apk", apk_dest,
                      file_size=artifact_store.get_file_size(apk_dest))

    # Queue for passing SSE events from the background thread to the generator
    event_queue: queue.Queue = queue.Queue()
    SENTINEL = object()

    def emit(event_type: str, data: dict):
        event_queue.put((event_type, data))

    def run_investigation():
        try:
            update_job_status(job_id, "running")
            # Route to appropriate orchestrator based on mode
            active_orchestrator = {
                "dynamic_only": dynamic_orchestrator,
                "autonomous": autonomous_orchestrator,
            }.get(analysis_mode, orchestrator)
            print(f"[App] Analysis mode: {analysis_mode} -> {active_orchestrator.__class__.__name__}", flush=True)
            result = active_orchestrator.investigate(tmp_path, emit=emit)

            # -- Phase 3: persist full result --
            update_job_result(job_id, result)
            evidence_items = _extract_evidence_items(result)
            add_evidence_items(job_id, evidence_items)

            # Persist YARA rule if generated
            if result.get("yara_rule"):
                save_yara_rule(job_id, result.get("yara_rule_name", "argus_detection"),
                               result["yara_rule"])
                yara_path = artifact_store.save_yara(job_id, result["yara_rule"])
                if yara_path:
                    save_artifact(job_id, "yara_file", yara_path,
                                  file_size=artifact_store.get_file_size(yara_path))

            result["job_id"] = job_id
            event_queue.put(("result", result))

        except Exception as e:
            import traceback
            traceback.print_exc()
            update_job_status(job_id, "failed")
            event_queue.put(("error", {"message": str(e)}))
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass
            event_queue.put(SENTINEL)

    thread = threading.Thread(target=run_investigation, daemon=True)
    thread.start()

    def generate():
        # First event always carries the job_id so the frontend can track it
        first_status = json.dumps({"phase": "starting",
                                   "message": "Investigation starting",
                                   "job_id": job_id})
        yield f"event: status\ndata: {first_status}\n\n"

        while True:
            try:
                item = event_queue.get(timeout=120)
            except queue.Empty:
                yield ": ping\n\n"
                continue

            if item is SENTINEL:
                break

            event_type, data = item
            payload = json.dumps(data)
            yield f"event: {event_type}\ndata: {payload}\n\n"

            if event_type in ("result", "error"):
                break

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


# ============================================================
# CHAT ROUTE (unchanged)
# ============================================================

@app.route('/chat', methods=['POST'])
def chat_followup():
    """Handle follow-up questions about a completed analysis using DeepSeek.

    Accepts:
        question (str): The user's question
        report_context (dict): The full analysis report from the frontend
        conversation_history (list): Previous messages [{role, content}, ...] for multi-turn context
        job_id (str, optional): If provided, loads full result from DB for richer context
    """
    if not llm_client:
        return jsonify({'answer': 'LLM is not configured. Set DEEPSEEK_API_KEY in .env'}), 200

    data = request.get_json(silent=True) or {}
    question = data.get('question', '').strip()
    report_context = data.get('report_context', {})
    conversation_history = data.get('conversation_history', [])
    job_id = data.get('job_id', '')

    if not question:
        return jsonify({'error': 'No question provided'}), 400

    from engine.prompts import CHAT_SYSTEM_PROMPT

    # --- Build rich analysis context ---
    ctx_parts = []

    # Try to load full result from DB if job_id is provided
    if job_id:
        try:
            job = get_job(job_id)
            if job and job.get('result_json'):
                full_result = job['result_json'] if isinstance(job['result_json'], dict) else json.loads(job['result_json'])
                report_context = {**full_result, **report_context}  # merge, frontend overrides
        except Exception as e:
            print(f"[chat] Could not load job {job_id}: {e}", flush=True)

    ctx_parts.append(f"**Package**: {report_context.get('package', report_context.get('package_name', 'unknown'))}")
    scope = report_context.get('analysisScope', report_context.get('analysis_scope', 'static_only'))
    ctx_parts.append(f"**Analysis Scope**: {'Static + Dynamic' if 'dynamic' in str(scope) else 'Static Only'}")

    if report_context.get('verdict'):
        ctx_parts.append(f"**Verdict**: {report_context['verdict']} ({report_context.get('confidence', '?')}% confidence)")
    if report_context.get('confidenceBreakdown') or report_context.get('confidence_breakdown'):
        ctx_parts.append(f"**Confidence Breakdown**: {report_context.get('confidenceBreakdown', report_context.get('confidence_breakdown', ''))}")
    if report_context.get('executiveSummary') or report_context.get('executive_summary'):
        ctx_parts.append(f"**Executive Summary**: {report_context.get('executiveSummary', report_context.get('executive_summary', ''))}")
    if report_context.get('analystSummary') or report_context.get('analyst_summary'):
        ctx_parts.append(f"**Analyst Summary**: {report_context.get('analystSummary', report_context.get('analyst_summary', ''))}")
    if report_context.get('recommendedActions') or report_context.get('recommended_actions'):
        ctx_parts.append(f"**Recommended Actions**: {report_context.get('recommendedActions', report_context.get('recommended_actions', ''))}")

    if report_context.get('highRisk') or report_context.get('high_risk_permissions'):
        perms = report_context.get('highRisk', report_context.get('high_risk_permissions', []))
        if perms:
            ctx_parts.append(f"**High-Risk Permissions**: {', '.join(perms)}")

    if report_context.get('apiCalls') or report_context.get('api_calls'):
        api_calls = report_context.get('apiCalls', report_context.get('api_calls', []))
        app_apis = [a for a in api_calls[:15] if not a.get('is_library')]
        if app_apis:
            apis = [f"`{a['api']}` in `{a['file']}`" for a in app_apis]
            ctx_parts.append(f"**App Code API Calls**:\n" + "\n".join(f"- {a}" for a in apis))

    if report_context.get('correlations'):
        validated = [c for c in report_context['correlations'] if c.get('status') == 'VALIDATED']
        not_validated = [c for c in report_context['correlations'] if c.get('status') == 'NOT_VALIDATED']
        if validated:
            ctx_parts.append(f"**Validated (runtime confirmed)**: {', '.join(c['capability'] for c in validated)}")
        if not_validated:
            ctx_parts.append(f"**Not Validated (code exists, not observed)**: {', '.join(c['capability'] for c in not_validated)}")

    if report_context.get('mitreTechniques') or report_context.get('mitre_techniques'):
        techniques = report_context.get('mitreTechniques', report_context.get('mitre_techniques', []))
        if techniques:
            ctx_parts.append(f"**MITRE ATT&CK**: {', '.join(techniques)}")

    if report_context.get('agentFindings') or report_context.get('agent_findings'):
        findings = report_context.get('agentFindings', report_context.get('agent_findings', {}))
        for agent_id, finding in findings.items():
            if isinstance(finding, dict):
                summary = finding.get('summary', '')
                detail_findings = finding.get('findings', [])
                agent_block = f"**{agent_id.title()} Agent**: {summary}"
                if detail_findings:
                    for df in detail_findings[:5]:
                        if isinstance(df, dict):
                            evidence = df.get('evidence', '')
                            interp = df.get('interpretation', '')
                            conf = df.get('confidence', '')
                            validation = df.get('runtime_validation', '')
                            agent_block += f"\n  - [{conf}] {evidence}: {interp} (Runtime: {validation})"
                ctx_parts.append(agent_block)

    if report_context.get('yaraRule') or report_context.get('yara_rule'):
        yara = report_context.get('yaraRule', report_context.get('yara_rule', ''))
        if yara:
            ctx_parts.append(f"**YARA Rule**:\n```yara\n{yara}\n```")

    # Include investigation timeline if available
    if report_context.get('investigation_timeline'):
        timeline_entries = report_context['investigation_timeline'][:10]
        timeline_text = "\n".join(f"  - {entry}" if isinstance(entry, str) else f"  - {entry.get('tool', '?')}: {entry.get('result_summary', '')}" for entry in timeline_entries)
        ctx_parts.append(f"**Investigation Timeline**:\n{timeline_text}")

    context = "\n\n".join(ctx_parts)

    try:
        print(f"[chat] Question: {question[:100]}", flush=True)
        print(f"[chat] History messages: {len(conversation_history)}", flush=True)

        # Build message list: system → context → conversation history → current question
        messages = [
            {"role": "system", "content": CHAT_SYSTEM_PROMPT},
            {"role": "user", "content": f"## Full Analysis Report Context\n\n{context}\n\n---\n\n*The above is the complete analysis context. Use it to answer the user's questions below.*"},
            {"role": "assistant", "content": "Understood. I have the full analysis context loaded. I'll reference specific evidence from the report in my answers and use rich markdown formatting. Ask me anything about this APK."},
        ]

        # Add conversation history (limit to last 10 exchanges to stay within context window)
        for msg in conversation_history[-20:]:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            if role in ('user', 'assistant') and content:
                messages.append({"role": role, "content": content})

        # Add the current question
        messages.append({"role": "user", "content": question})

        log_llm_prompt("Chat Assistant", messages)

        response = llm_client.chat.completions.create(
            model="deepseek-v4-flash",
            messages=messages,
            temperature=0.3,
            max_tokens=4096,
        )
        answer = response.choices[0].message.content.strip()
        answer = enforce_language_rules(answer)
        print(f"[chat] Answer length: {len(answer)} chars", flush=True)
        return jsonify({'answer': answer})

    except Exception as e:
        print(f"[chat] ERROR: {type(e).__name__}: {e}", flush=True)
        return jsonify({'answer': f'Sorry, I encountered an error: {e}'}), 200


# ============================================================
# PHASE 3 — REST ENDPOINTS FOR STORED RESULTS
# ============================================================

@app.route('/jobs', methods=['GET'])
def api_list_jobs():
    """List all analysis jobs (paginated).

    Query params:
        limit   (int, default 50)  — max rows to return
        offset  (int, default 0)   — pagination offset
        status  (str, optional)    — filter by status

    Response:
        {
          "jobs": [...],
          "total": <int>,
          "limit": <int>,
          "offset": <int>
        }
    """
    try:
        limit  = min(int(request.args.get("limit",  50)), 200)
        offset = max(int(request.args.get("offset",  0)),   0)
        status = request.args.get("status")
        jobs   = list_jobs(limit=limit, offset=offset, status_filter=status)
        total  = count_jobs(status_filter=status)
        return jsonify({"jobs": jobs, "total": total, "limit": limit, "offset": offset})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/jobs/<job_id>', methods=['GET'])
def api_get_job(job_id: str):
    """Return the full detail for a single job, including result JSON.

    Response:
        { id, filename, status, verdict, confidence, result, ... }

    Returns 404 if the job doesn't exist.
    """
    job = get_job(job_id)
    if job is None:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job)


@app.route('/jobs/<job_id>/result', methods=['GET'])
def api_get_job_result(job_id: str):
    """Return just the verdict/confidence/summary fields for a job.

    Lighter than GET /jobs/<id> — no full result_json blob.
    Useful for polling job status without transferring the entire payload.

    Returns 404 if job doesn't exist, 202 if still running.
    """
    job = get_job(job_id)
    if job is None:
        return jsonify({"error": "Job not found"}), 404
    if job["status"] in ("queued", "running"):
        return jsonify({
            "job_id": job_id,
            "status": job["status"],
            "message": "Analysis still in progress",
        }), 202
    return jsonify({
        "job_id":          job_id,
        "status":          job["status"],
        "verdict":         job["verdict"],
        "confidence":      job["confidence"],
        "risk_score":      job["risk_score"],
        "analysis_scope":  job["analysis_scope"],
        "iteration_count": job["iteration_count"],
        "executive_summary": job["executive_summary"],
        "created_at":      job["created_at"],
        "completed_at":    job["completed_at"],
    })


@app.route('/jobs/<job_id>/evidence', methods=['GET'])
def api_get_evidence(job_id: str):
    """Return paginated evidence items for a job.

    Query params:
        limit    (int, default 200)
        offset   (int, default 0)
        category (str, optional)  — filter by category

    Returns 404 if job doesn't exist.
    """
    if get_job(job_id) is None:
        return jsonify({"error": "Job not found"}), 404
    try:
        limit    = min(int(request.args.get("limit",  200)), 500)
        offset   = max(int(request.args.get("offset",   0)),   0)
        category = request.args.get("category")
        items    = get_evidence(job_id, limit=limit, offset=offset, category=category)
        return jsonify({"evidence": items, "count": len(items), "limit": limit, "offset": offset})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/jobs/<job_id>/yara', methods=['GET'])
def api_get_yara(job_id: str):
    """Download the generated YARA rule for a job as a .yar file.

    Returns 404 if no YARA rule exists for this job.
    """
    rule = get_yara(job_id)
    if rule is None:
        return jsonify({"error": "No YARA rule for this job"}), 404

    # Prefer serving from the artifact file on disk
    yara_path = artifact_store.get_artifact_path(job_id, "yara_file")
    if yara_path and os.path.exists(yara_path):
        return send_file(
            yara_path,
            mimetype="text/plain",
            as_attachment=True,
            download_name=f"{rule['rule_name']}.yar",
        )

    # Fallback: serve from DB text
    rule_text = rule["rule_text"]
    rule_name = rule["rule_name"]
    return Response(
        rule_text,
        mimetype="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{rule_name}.yar"',
        },
    )


@app.route('/jobs/<job_id>/artifacts', methods=['GET'])
def api_list_artifacts(job_id: str):
    """List all stored artifact records for a job.

    Returns 404 if job doesn't exist.
    """
    if get_job(job_id) is None:
        return jsonify({"error": "Job not found"}), 404
    artifacts = get_artifacts(job_id)
    return jsonify({"artifacts": artifacts})


@app.route('/jobs/<job_id>/artifacts/<path:filename>', methods=['GET'])
def api_serve_artifact(job_id: str, filename: str):
    """Serve a stored artifact file for download.

    The filename is relative to the job's artifact directory, e.g.:
        /jobs/{id}/artifacts/original.apk
        /jobs/{id}/artifacts/detection.yar
        /jobs/{id}/artifacts/screenshots/screenshot_001.png

    Returns 403 for path traversal attempts, 404 if file not found.
    """
    # Resolve path and guard against directory traversal
    job_dir = artifact_store.root / job_id
    if not job_dir.exists():
        return jsonify({"error": "Job artifact directory not found"}), 404

    # Resolve and validate path stays within the job dir
    try:
        target = (job_dir / filename).resolve()
        job_dir_resolved = job_dir.resolve()
        if not str(target).startswith(str(job_dir_resolved)):
            return jsonify({"error": "Forbidden"}), 403
    except Exception:
        return jsonify({"error": "Invalid path"}), 400

    if not target.exists() or not target.is_file():
        return jsonify({"error": "Artifact not found"}), 404

    return send_file(str(target), as_attachment=True, download_name=target.name)


@app.route('/jobs/<job_id>', methods=['DELETE'])
def api_delete_job(job_id: str):
    """Soft-delete a job (sets status='deleted', does not remove DB rows).

    The artifact files on disk are also removed.
    Returns 404 if job doesn't exist.
    """
    job = get_job(job_id)
    if job is None:
        return jsonify({"error": "Job not found"}), 404
    soft_delete_job(job_id)
    artifact_store.delete_job_artifacts(job_id)
    return jsonify({"success": True, "job_id": job_id, "status": "deleted"})


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route('/health', methods=['GET'])
def health():
    """Simple health check endpoint."""
    return jsonify({
        "status": "ok",
        "tools": len(registry.list_tool_names()),
        "llm": llm_client is not None,
        "db": "sqlite",
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050)
