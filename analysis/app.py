"""
ARGUS Backend — Flask API Routes

This is the slim entry point for the ARGUS backend. All analysis logic
has been moved to the agentic engine (engine/) and tool layer (tools/).

This file only handles:
1. Flask setup and CORS
2. File upload and temp file management
3. Delegating to InvestigationOrchestrator
4. The /chat follow-up endpoint
5. The /analyze endpoint (backward-compatible response shape)

The 1633-line monolith has been decomposed into:
- analysis/shared/    → constants, scoring, evidence, language utilities
- analysis/tools/     → tool registry + 9 individual tool wrappers
- analysis/engine/    → orchestrator, planner, memory, prompts

The frontend sees the EXACT same response JSON — no frontend changes needed.
"""

import os
import sys
import tempfile
import json
import logging

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

# ---------- Path Setup ----------
# Add the analysis directory to sys.path so that shared/, tools/, engine/
# can be imported as top-level packages from within the analysis/ directory.
ANALYSIS_DIR = os.path.dirname(os.path.abspath(__file__))
if ANALYSIS_DIR not in sys.path:
    sys.path.insert(0, ANALYSIS_DIR)

# Load .env from the same directory as this script
load_dotenv(os.path.join(ANALYSIS_DIR, '.env'))

# Suppress androguard's extremely verbose DEBUG output
logging.getLogger('androguard').setLevel(logging.WARNING)

from engine.orchestrator import InvestigationOrchestrator
from tools.registry import ToolRegistry
from shared.language import enforce_language_rules, log_llm_prompt
from pathlib import Path

app = Flask(__name__)
CORS(app)

# ---------- Java / Tool Paths ----------
# The individual tools handle their own path resolution via TOOL_PATHS,
# but Java needs to be on PATH for both JADX and APKTool to work.
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
# The tool registry auto-discovers and registers all tools.
# The orchestrator wires the planner, tools, and memory together.
registry = ToolRegistry()
registry.auto_register()
orchestrator = InvestigationOrchestrator(llm_client, registry)

print(f"[INIT] ARGUS agentic engine initialized with {len(registry.list_tool_names())} tools", flush=True)
print(f"[INIT] Available tools: {', '.join(registry.list_tool_names())}", flush=True)


# ---------- Routes ----------

@app.route('/analyze', methods=['POST'])
def analyze_apk():
    """Analyze an uploaded APK file using the agentic investigation engine.

    The orchestrator dynamically decides which tools to run based on
    evidence accumulated during the investigation. Each APK produces
    a different investigation path.

    Response shape is IDENTICAL to the old pipeline — frontend compatibility
    is preserved. The only new fields are investigation_timeline,
    investigation_iterations, and investigation_coverage.
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
    tmp_fd, tmp_path = tempfile.mkstemp(suffix='.apk')
    os.close(tmp_fd)

    try:
        f.save(tmp_path)

        # Delegate to the agentic orchestrator.
        # This is where the magic happens — the AI decides which tools
        # to run, in what order, based on accumulated evidence.
        result = orchestrator.investigate(tmp_path)

        print(f"[analyze_apk] DONE — verdict={result.get('verdict', 'N/A')} "
              f"scope={result.get('analysis_scope', 'unknown')} "
              f"iterations={result.get('investigation_iterations', '?')}", flush=True)

        return jsonify(result)

    except Exception as e:
        print(f"[analyze_apk] ERROR: {type(e).__name__}: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

    finally:
        # Clean up temp APK file
        try:
            os.remove(tmp_path)
        except Exception:
            pass


@app.route('/chat', methods=['POST'])
def chat_followup():
    """Handle follow-up questions about a completed analysis using DeepSeek.

    This endpoint is unchanged from the original — same request/response
    format. The only enhancement is that it now references investigation
    timeline data if available in the report context.
    """
    if not llm_client:
        return jsonify({'answer': 'LLM is not configured. Set DEEPSEEK_API_KEY in .env'}), 200

    data = request.get_json(silent=True) or {}
    question = data.get('question', '').strip()
    report_context = data.get('report_context', {})

    if not question:
        return jsonify({'error': 'No question provided'}), 400

    # Import the chat prompt
    from engine.prompts import CHAT_SYSTEM_PROMPT

    # Build context from the report
    ctx_parts = [f"**Package**: {report_context.get('package', 'unknown')}"]
    scope = report_context.get('analysisScope', 'static_only')
    ctx_parts.append(f"**Analysis Scope**: {'Static + Dynamic' if scope == 'static_and_dynamic' else 'Static Only'}")

    if report_context.get('verdict'):
        ctx_parts.append(f"**Verdict**: {report_context['verdict']} ({report_context.get('confidence', '?')}% confidence)")
    if report_context.get('confidenceBreakdown'):
        ctx_parts.append(f"**Confidence Breakdown**: {report_context['confidenceBreakdown']}")
    if report_context.get('executiveSummary'):
        ctx_parts.append(f"**Executive Summary**: {report_context['executiveSummary']}")
    if report_context.get('highRisk'):
        ctx_parts.append(f"**High-Risk Permissions (capabilities)**: {', '.join(report_context['highRisk'])}")

    if report_context.get('apiCalls'):
        app_apis = [a for a in report_context['apiCalls'][:10] if not a.get('is_library')]
        if app_apis:
            apis = [f"{a['api']} in {a['file']}" for a in app_apis]
            ctx_parts.append(f"**App Code APIs (capabilities)**: {', '.join(apis)}")

    if report_context.get('correlations'):
        validated = [c for c in report_context['correlations'] if c.get('status') == 'VALIDATED']
        not_validated = [c for c in report_context['correlations'] if c.get('status') == 'NOT_VALIDATED']
        if validated:
            ctx_parts.append(f"**Validated (runtime confirmed)**: {', '.join(c['capability'] for c in validated)}")
        if not_validated:
            ctx_parts.append(f"**Not Validated (code exists, not observed)**: {', '.join(c['capability'] for c in not_validated)}")

    if report_context.get('mitreTechniques'):
        ctx_parts.append(f"**MITRE ATT&CK**: {', '.join(report_context['mitreTechniques'])}")

    if report_context.get('agentFindings'):
        for agent_id, finding in report_context['agentFindings'].items():
            summary = finding.get('summary', '')
            ctx_parts.append(f"**{agent_id.title()} Agent**: {summary}")

    if report_context.get('recommendedActions'):
        ctx_parts.append(f"**Recommended Actions**: {report_context['recommendedActions']}")

    context = "\n".join(ctx_parts)

    try:
        print(f"[chat] Question: {question[:100]}", flush=True)
        messages = [
            {"role": "system", "content": CHAT_SYSTEM_PROMPT},
            {"role": "user", "content": f"## Analysis Context\n{context}\n\n## User Question\n{question}"},
        ]
        log_llm_prompt("Chat Assistant", messages)

        response = llm_client.chat.completions.create(
            model="deepseek-v4-flash",
            messages=messages,
            temperature=0.3,
            max_tokens=500,
        )
        answer = response.choices[0].message.content.strip()
        # Apply language enforcement to chat answers
        answer = enforce_language_rules(answer)
        print(f"[chat] Answer: {answer[:100]}...", flush=True)
        return jsonify({'answer': answer})

    except Exception as e:
        print(f"[chat] ERROR: {type(e).__name__}: {e}", flush=True)
        return jsonify({'answer': f'Sorry, I encountered an error: {e}'}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050)
