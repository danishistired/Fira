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


_ENV_PATH = os.path.join(ANALYSIS_DIR, '.env')

def _persist_current_apk(apk_path: str, job_id: str, filename: str = "") -> None:
    """Write CURRENT_APK_PATH, CURRENT_JOB_ID, and CURRENT_APK_FILENAME to .env
    so the path survives server restarts and is accessible in new Antigravity
    sessions without requiring a re-upload.

    Reads the existing .env, replaces or appends the three keys, then rewrites
    the file — preserving all other keys (API keys, etc.).
    """
    try:
        # Read existing lines, stripping the three managed keys
        managed_keys = {"CURRENT_APK_PATH", "CURRENT_JOB_ID", "CURRENT_APK_FILENAME"}
        existing_lines = []
        if os.path.exists(_ENV_PATH):
            with open(_ENV_PATH, "r", encoding="utf-8") as fh:
                for line in fh:
                    key = line.split("=", 1)[0].strip()
                    if key not in managed_keys:
                        existing_lines.append(line.rstrip("\n"))

        # Append the three managed keys with fresh values
        existing_lines += [
            f"CURRENT_APK_PATH={apk_path}",
            f"CURRENT_JOB_ID={job_id}",
            f"CURRENT_APK_FILENAME={filename}",
        ]

        with open(_ENV_PATH, "w", encoding="utf-8") as fh:
            fh.write("\n".join(existing_lines) + "\n")

        # Also update os.environ so the running process sees them immediately
        os.environ["CURRENT_APK_PATH"] = apk_path
        os.environ["CURRENT_JOB_ID"] = job_id
        os.environ["CURRENT_APK_FILENAME"] = filename

        print(f"[persist_apk] Saved CURRENT_APK_PATH={apk_path} CURRENT_JOB_ID={job_id}", flush=True)
    except Exception as exc:
        print(f"[persist_apk] WARNING: could not write to .env: {exc}", flush=True)


# Restore last-known APK path from .env on startup (survives server restarts)
_startup_apk_path = os.environ.get("CURRENT_APK_PATH", "")
if _startup_apk_path and os.path.exists(_startup_apk_path):
    print(f"[INIT] Restored CURRENT_APK_PATH from .env: {_startup_apk_path}", flush=True)
elif _startup_apk_path:
    print(f"[INIT] WARNING: CURRENT_APK_PATH in .env points to missing file: {_startup_apk_path}", flush=True)


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
            # Persist path to .env so next session can find the APK without re-upload
            _persist_current_apk(apk_dest, job_id, filename=f.filename)

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
        # Persist path to .env so next session can find the APK without re-upload
        _persist_current_apk(apk_dest, job_id, filename=f.filename)

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

    Supports tool calling: if the LLM decides to invoke an ARGUS tool
    (e.g. re-run VirusTotal, decompile deeper), we execute it and feed
    results back in an agentic loop until the LLM produces a final answer.

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

    # --- Resolve APK path from artifact store (needed for tool calls) ---
    apk_path = None
    package_name = None
    if job_id:
        apk_path = artifact_store.get_artifact_path(job_id, "apk")
        if apk_path:
            print(f"[chat] Resolved APK path from artifacts: {apk_path}", flush=True)

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

    # Extract package name from context
    package_name = report_context.get('package', report_context.get('package_name', 'unknown'))

    ctx_parts.append(f"**Package**: {package_name}")
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
            {"role": "user", "content": f"## Full Analysis Report Context\n\n{context}\n\n---\n\n*The above is the complete analysis context. Use it to answer the user's questions below. You also have access to ARGUS tools if you need to perform additional analysis.*"},
            {"role": "assistant", "content": "Understood. I have the full analysis context loaded and access to ARGUS investigation tools. I'll reference specific evidence from the report in my answers, use rich markdown formatting, and call tools when additional analysis is needed. Ask me anything about this APK."},
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

        # Build OpenAI-format tool definitions from the registry
        # Exclude generate_report (internal) — all other tools are available
        tool_definitions = registry.list_openai_tools(exclude=["generate_report"])

        # --- Agentic tool-call loop ---
        MAX_TOOL_ROUNDS = 5  # Safety cap to prevent runaway loops
        tool_calls_made = []

        for round_num in range(MAX_TOOL_ROUNDS + 1):
            response = llm_client.chat.completions.create(
                model="deepseek-v4-flash",
                messages=messages,
                tools=tool_definitions if apk_path else None,  # Only offer tools if we have the APK
                temperature=0.3,
                max_tokens=8192,
            )

            choice = response.choices[0]

            # Check if the LLM wants to call tools
            if choice.finish_reason == "tool_calls" or (hasattr(choice.message, 'tool_calls') and choice.message.tool_calls):
                if round_num >= MAX_TOOL_ROUNDS:
                    # Safety cap reached — force a text response
                    print(f"[chat] Tool-call cap reached ({MAX_TOOL_ROUNDS} rounds). Forcing text response.", flush=True)
                    break

                # Append the assistant's tool_calls message
                messages.append(choice.message)

                for tool_call in choice.message.tool_calls:
                    fn_name = tool_call.function.name
                    try:
                        fn_args = json.loads(tool_call.function.arguments)
                    except json.JSONDecodeError:
                        fn_args = {}

                    print(f"[chat] Tool call (round {round_num + 1}): {fn_name}({fn_args})", flush=True)

                    # Inject apk_path and package_name if the tool needs them
                    if fn_name in ("extract_manifest", "run_apktool", "run_jadx", "run_frida", "scan_permissions"):
                        if "apk_path" not in fn_args and apk_path:
                            fn_args["apk_path"] = apk_path
                    if fn_name in ("run_frida", "run_monkey", "collect_logcat"):
                        if "package_name" not in fn_args and package_name and package_name != "unknown":
                            fn_args["package_name"] = package_name

                    # Execute the tool
                    tool_result = registry.execute(fn_name, **fn_args)
                    tool_calls_made.append({"tool": fn_name, "args": fn_args, "success": tool_result.get("success", False)})

                    # Summarize the result for the LLM (avoid sending massive raw data)
                    result_summary = _summarize_tool_result(fn_name, tool_result)

                    # Append tool result message
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result_summary,
                    })

                    print(f"[chat] Tool {fn_name} done: success={tool_result.get('success', False)}, "
                          f"summary_len={len(result_summary)} chars", flush=True)

                # Continue loop — let the LLM process tool results
                continue

            else:
                # LLM produced a final text response
                break

        # Extract the final answer
        answer = (choice.message.content or "").strip()
        if not answer:
            answer = "I wasn't able to generate a response. Please try rephrasing your question."

        answer = enforce_language_rules(answer)

        if tool_calls_made:
            print(f"[chat] Answer generated after {len(tool_calls_made)} tool calls: {[tc['tool'] for tc in tool_calls_made]}", flush=True)
        print(f"[chat] Answer length: {len(answer)} chars", flush=True)

        return jsonify({
            'answer': answer,
            'tool_calls': tool_calls_made if tool_calls_made else None,
        })

    except Exception as e:
        print(f"[chat] ERROR: {type(e).__name__}: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return jsonify({'answer': f'Sorry, I encountered an error: {e}'}), 200


def _summarize_tool_result(tool_name: str, result: dict) -> str:
    """Summarize a tool result for the LLM context window.

    We don't want to dump 50KB of raw JADX output into the conversation.
    Instead, send structured summaries that the LLM can synthesize into
    a rich response.
    """
    if not result.get("success"):
        return json.dumps({"success": False, "error": result.get("error", "Tool execution failed")})

    # Start with the summary line if available
    parts = []
    if result.get("summary"):
        parts.append(f"Summary: {result['summary']}")

    # Tool-specific summarization
    if tool_name == "run_jadx":
        parts.append(f"High signal: {result.get('high_signal_count', 0)}")
        parts.append(f"Medium signal: {result.get('medium_signal_count', 0)}")
        parts.append(f"Low signal: {result.get('low_signal_count', 0)}")
        for api in result.get("suspicious_apis", [])[:10]:
            parts.append(f"  [{api.get('signal', '?')}] {api.get('api', '?')} in {api.get('file', '?')}: {api.get('description', '')}")
        for secret in result.get("hardcoded_secrets", [])[:5]:
            parts.append(f"  [SECRET] {secret.get('type', '?')} in {secret.get('file', '?')} line {secret.get('line', '?')}")
        for snippet in result.get("code_snippets", [])[:3]:
            parts.append(f"  [CODE] {snippet.get('file', '?')}:{snippet.get('line', '?')} — {snippet.get('api', '?')}\n{snippet.get('code', '')[:500]}")

    elif tool_name == "extract_manifest":
        if result.get("permissions"):
            parts.append(f"Permissions ({len(result['permissions'])}): {', '.join(result['permissions'][:20])}")
        if result.get("activities"):
            parts.append(f"Activities: {len(result.get('activities', []))}")
        if result.get("services"):
            parts.append(f"Services: {len(result.get('services', []))}")
        if result.get("receivers"):
            parts.append(f"Receivers: {len(result.get('receivers', []))}")

    elif tool_name == "scan_permissions":
        if result.get("high_risk"):
            parts.append(f"High-risk permissions: {', '.join(result['high_risk'][:15])}")
        if result.get("risk_score") is not None:
            parts.append(f"Risk score: {result['risk_score']}%")

    elif tool_name in ("run_frida", "collect_logcat", "run_monkey"):
        if result.get("events"):
            for evt in result.get("events", [])[:10]:
                parts.append(f"  [{evt.get('event_type', '?')}] {evt.get('data', str(evt))[:200]}")
        if result.get("logs"):
            parts.append(f"Log entries: {len(result.get('logs', []))}")

    else:
        # Generic: serialize the top-level keys (excluding large binary data)
        for key, value in result.items():
            if key in ("success", "summary", "out_dir"):
                continue
            if isinstance(value, str) and len(value) > 500:
                parts.append(f"{key}: {value[:500]}...")
            elif isinstance(value, list) and len(value) > 10:
                parts.append(f"{key}: [{len(value)} items] {json.dumps(value[:5], default=str)[:500]}")
            elif isinstance(value, dict):
                parts.append(f"{key}: {json.dumps(value, default=str)[:500]}")
            else:
                parts.append(f"{key}: {value}")

    return "\n".join(parts) if parts else json.dumps(result, default=str)[:2000]


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
# CURRENT APK ENDPOINT
# ============================================================

@app.route('/current-apk', methods=['GET'])
def api_current_apk():
    """Return the path and metadata of the most-recently uploaded APK.

    This path is persisted to .env on every upload so it survives server
    restarts and is accessible in new Antigravity sessions without requiring
    the user to re-upload the file.

    Response:
        {
          "apk_path":  "<absolute path to original.apk in artifact store>",
          "job_id":    "<uuid>",
          "filename":  "<original upload filename>",
          "exists":    true | false   (whether the file is still on disk)
        }
    Returns 404 if no APK has been uploaded yet in this instance.
    """
    apk_path = os.environ.get("CURRENT_APK_PATH", "")
    job_id   = os.environ.get("CURRENT_JOB_ID",   "")
    filename = os.environ.get("CURRENT_APK_FILENAME", "")

    if not apk_path or not job_id:
        return jsonify({"error": "No APK uploaded yet"}), 404

    return jsonify({
        "apk_path": apk_path,
        "job_id":   job_id,
        "filename": filename,
        "exists":   os.path.exists(apk_path),
    })


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route('/health', methods=['GET'])
def health():
    """Simple health check endpoint."""
    current_apk = os.environ.get("CURRENT_APK_PATH", "")
    return jsonify({
        "status": "ok",
        "tools": len(registry.list_tool_names()),
        "llm": llm_client is not None,
        "db": "sqlite",
        "current_apk": current_apk if current_apk else None,
        "current_job_id": os.environ.get("CURRENT_JOB_ID", None),
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050)
