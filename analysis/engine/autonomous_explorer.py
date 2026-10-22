"""
Autonomous UI Explorer for ARGUS.

An LLM-driven agent that navigates an Android app intelligently:
dump the view hierarchy → simplify → send to LLM → execute the
LLM's chosen action → repeat.  Runs alongside Frida and network
capture, feeding real-time hook events back to the LLM so it can
steer toward security-relevant behaviours.

Design:
- The loop runs in the main thread (orchestrator threads Frida +
  network capture separately).
- Each step emits SSE events so the frontend shows live progress.
- Safety is enforced by a fixed action whitelist — the LLM can
  never execute arbitrary code or leave the target app.
"""

from __future__ import annotations

import json
import time
import datetime
from typing import Callable, Optional

from engine.ui_agent_prompts import (
    MODEL_EXPLORER,
    build_explorer_system_prompt,
)
from shared.language import parse_llm_json, log_llm_prompt


# ---- Exploration budget defaults ----
DEFAULT_MAX_STEPS = 50
DEFAULT_MAX_SECONDS = 300       # 5 minutes
DEFAULT_STEP_SETTLE = 0.8       # seconds to wait after each action
UI_STALL_LIMIT = 4               # same screen N times in a row → done
LLM_MAX_FAILURES = 8             # consecutive LLM parse failures → fallback
APP_RELAUNCH_ATTEMPTS = 5        # crash recovery retries
RELAUNCH_COOLDOWN = 3.0          # min seconds between relaunches

# Valid actions the LLM can request
_VALID_ACTIONS = frozenset({
    "click", "long_click", "input", "swipe", "press",
    "wait", "launch_activity", "done",
})

_VALID_PRESS_KEYS = frozenset({"back", "home", "enter", "menu"})
_VALID_SWIPE_DIRS = frozenset({"up", "down", "left", "right"})

# Packages that mean the app exited / crashed
_LAUNCHER_PACKAGES = frozenset({
    "com.android.launcher", "com.android.launcher3",
    "com.google.android.apps.nexuslauncher",
    "com.android.systemui",
    "host.exp.exponent",              # Expo Go — steals focus on some emulators
    "com.android.settings",
    "com.google.android.googlequicksearchbox",  # Google Search / QSB
})


class ExplorationConfig:
    """Tunable budget and safety knobs for the explorer."""
    def __init__(
        self,
        max_steps: int = DEFAULT_MAX_STEPS,
        max_seconds: int = DEFAULT_MAX_SECONDS,
        step_settle: float = DEFAULT_STEP_SETTLE,
        stall_limit: int = UI_STALL_LIMIT,
        llm_max_failures: int = LLM_MAX_FAILURES,
        relaunch_attempts: int = APP_RELAUNCH_ATTEMPTS,
    ):
        self.max_steps = max_steps
        self.max_seconds = max_seconds
        self.step_settle = step_settle
        self.stall_limit = stall_limit
        self.llm_max_failures = llm_max_failures
        self.relaunch_attempts = relaunch_attempts


class AutonomousExplorer:
    """LLM-driven UI exploration agent.

    Instantiate once per investigation.  Call ``explore()`` to start
    the dump→decide→act loop.  Results are returned as a structured
    dict and streamed via the ``emit`` callback.

    Args:
        llm_client: OpenAI-compatible client (DeepSeek).
        ui_tool: ``UIAutomatorTool`` instance (already connected).
        package_name: Target app package.
        manifest_context: Dict from ``extract_manifest`` — activities,
                          permissions, exported components, etc.
        frida_handle: ``FridaStreamHandle`` for polling new hook events.
        sandbox: ``SandboxOrchestrator`` instance (for crash relaunch).
        emit: Optional ``(event_type, data)`` SSE callback.
        config: Optional ``ExplorationConfig`` overrides.
    """

    def __init__(
        self,
        llm_client,
        ui_tool,
        package_name: str,
        manifest_context: dict,
        frida_handle,
        sandbox,
        emit: Optional[Callable[[str, dict], None]] = None,
        config: Optional[ExplorationConfig] = None,
    ):
        self._llm = llm_client
        self._ui = ui_tool
        self._package = package_name
        self._manifest = manifest_context
        self._frida = frida_handle
        self._sandbox = sandbox
        self._emit = emit or (lambda e, d: None)
        self._cfg = config or ExplorationConfig()

        # Internal state
        self._journal: list[dict] = []
        self._activities_visited: list[str] = []
        self._screens_seen: set[str] = set()
        self._ui_hashes: list[str] = []  # last N hashes for stall detection
        self._step_count = 0
        self._start_time = 0.0
        self._stop_reason = ""
        self._llm_failures = 0
        self._relaunch_count = 0
        self._system_prompt = ""
        # Anti-loop: track dismissed dialog button texts to break infinite cycles
        self._dismissed_dialog_counts: dict[str, int] = {}
        # Anti-storm: minimum interval between relaunches
        self._last_relaunch_time = 0.0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def explore(self) -> dict:
        """Run the exploration loop.  Returns a structured result dict."""
        self._start_time = time.time()

        # Build the system prompt once
        self._system_prompt = build_explorer_system_prompt(self._manifest)

        # Set the target package on the UI tool so dump filtering works
        self._ui.set_target_package(self._package)

        # Emit start event
        self._emit("explorer_start", {
            "package": self._package,
            "max_steps": self._cfg.max_steps,
            "max_seconds": self._cfg.max_seconds,
            "activities": len(self._manifest.get("activities", [])),
            "exported_components": len(self._manifest.get("exported_components", [])),
        })

        # Re-launch the app to ensure it's in the foreground
        self._launch_app()

        # ---- Pre-flight: dismiss system dialogs (compat warnings, etc.) ----
        for _ in range(5):
            if not self._dismiss_system_dialogs():
                break
            time.sleep(0.5)

        while True:
            ok = self._step()
            if not ok:
                break

        # Emit completion
        self._emit("explorer_done", {
            "total_steps": self._step_count,
            "screens_visited": len(self._screens_seen),
            "activities_visited": len(self._activities_visited),
            "stop_reason": self._stop_reason,
            "frida_events_total": len(self._frida.all_logs()) if self._frida else 0,
            "duration_seconds": round(time.time() - self._start_time, 1),
        })

        return {
            "steps": self._journal,
            "activities_visited": self._activities_visited,
            "screens_explored": len(self._screens_seen),
            "elements_touched": sum(
                1 for s in self._journal if s.get("action") in ("click", "long_click", "input")
            ),
            "stop_reason": self._stop_reason,
            "frida_events_total": len(self._frida.all_logs()) if self._frida else 0,
            "started_at": datetime.datetime.fromtimestamp(self._start_time).isoformat(),
            "ended_at": datetime.datetime.now().isoformat(),
        }

    # ------------------------------------------------------------------
    # Per-step loop
    # ------------------------------------------------------------------

    def _step(self) -> bool:
        """Execute one exploration iteration.  Returns False when done."""
        self._step_count += 1

        # ---- Budget checks ----
        elapsed = time.time() - self._start_time
        if self._step_count > self._cfg.max_steps:
            self._stop_reason = "max_steps"
            return False
        if elapsed >= self._cfg.max_seconds:
            self._stop_reason = "max_duration"
            return False

        # ---- Dump UI ----
        dump_result = self._ui.execute(action="dump", target_package=self._package)
        if not dump_result.get("success"):
            self._stop_reason = f"ui_dump_failed: {dump_result.get('error', 'unknown')}"
            return False

        ui_text = dump_result.get("ui_text", "")
        elements = dump_result.get("elements", [])
        screen = dump_result.get("screen", {})

        # Track the screen
        activity = screen.get("activity", "") or self._get_current_activity()
        screen_key = f"{activity}|{screen.get('package', '')}"
        if screen_key and screen_key not in self._screens_seen:
            self._screens_seen.add(screen_key)
            if activity:
                self._activities_visited.append(activity)

        # ---- Stall detection ----
        from shared.ui_simplifier import hash_ui_signature
        # We need UIElement objects for hashing — parse them from elements dicts
        sig = _hash_element_dicts(elements)
        self._ui_hashes.append(sig)
        if len(self._ui_hashes) > self._cfg.stall_limit:
            self._ui_hashes.pop(0)
        if (
            len(self._ui_hashes) >= self._cfg.stall_limit
            and len(set(self._ui_hashes)) == 1
        ):
            self._stop_reason = "ui_stall"
            return False


        # ---- Collect Frida events ----
        new_frida_events: list[str] = []
        if self._frida:
            new_frida_events = self._frida.poll_new_logs()

        # ---- Decide ----
        decision = self._decide(ui_text, elements, screen, new_frida_events, elapsed)

        # ---- Handle done ----
        if decision.get("action") == "done" or decision.get("done"):
            self._stop_reason = "llm_done"
            return False

        # ---- Execute ----
        action_success = self._execute_action(decision, elements, screen)

        # ---- Settle ----
        time.sleep(self._cfg.step_settle)

        # ---- Post-action checks ----
        self._check_app_alive()

        # ---- Journal ----
        self._journal.append({
            "step": self._step_count,
            "action": decision.get("action"),
            "target": decision.get("target_desc", ""),
            "element_index": decision.get("target_index"),
            "input_text": decision.get("input_text", ""),
            "reason": decision.get("reason", ""),
            "success": action_success,
            "new_frida_events": len(new_frida_events),
            "activity_after": activity,
            "ui_text": ui_text[:500],  # keep journal compact
            "timestamp": datetime.datetime.now().isoformat(),
        })

        return True

    # ------------------------------------------------------------------
    # LLM decision
    # ------------------------------------------------------------------

    def _decide(
        self,
        ui_text: str,
        elements: list[dict],
        screen: dict,
        new_frida_events: list[str],
        elapsed: float,
    ) -> dict:
        """Ask the LLM what to do next.  Returns a validated decision dict."""
        # Build user message
        user_parts = [
            f"## Step {self._step_count}/{self._cfg.max_steps}  |  "
            f"Elapsed {int(elapsed)}s/{self._cfg.max_seconds}s",
        ]

        # Frida events
        if new_frida_events:
            user_parts.append(f"\n## Frida Events (since last action) — {len(new_frida_events)} new")
            for evt in new_frida_events[-5:]:
                user_parts.append(f"  {evt[:120]}")
        else:
            user_parts.append("\n## Frida Events — (none since last action)")

        # Current screen
        user_parts.append(f"\n## Current Screen\n```\n{ui_text}\n```")

        # History (last 5 steps)
        if self._journal:
            user_parts.append("\n## Recent Actions")
            for s in self._journal[-5:]:
                status = "✓" if s.get("success") else "✗"
                user_parts.append(
                    f"- {status} Step {s['step']}: {s.get('action', '?')} "
                    f"→ {s.get('reason', '')[:60]}"
                )

        # Stalled?
        if len(self._ui_hashes) >= 2 and self._ui_hashes[-1] == self._ui_hashes[-2]:
            user_parts.append("\n⚠ Screen unchanged after last action. Try something different or press BACK.")

        user_parts.append("\n## Decide the next action. Respond with JSON only.")

        user_message = "\n".join(user_parts)

        messages = [
            {"role": "system", "content": self._system_prompt},
            {"role": "user", "content": user_message},
        ]

        # Call LLM
        empty_response_count = 0
        for attempt in (1, 2, 3):
            try:
                if attempt == 1:
                    log_llm_prompt(f"UI Explorer (step {self._step_count})", messages)

                response = self._llm.chat.completions.create(
                    model=MODEL_EXPLORER,
                    messages=messages,
                    temperature=0.2 + (attempt - 1) * 0.1,
                    max_tokens=800,
                )
                raw = (response.choices[0].message.content or "").strip()

                # Handle truly empty responses — retry, don't count as failure
                if not raw:
                    empty_response_count += 1
                    if empty_response_count >= 2:
                        print(f"[Explorer] LLM returned empty response {empty_response_count} times — using fallback", flush=True)
                        break
                    print(f"[Explorer] LLM returned empty response (attempt {attempt}) — retrying...", flush=True)
                    time.sleep(0.5)
                    continue

                # Repair common JSON issues before parsing
                raw = _repair_json(raw)
                decision = parse_llm_json(raw)

                if decision and self._validate_decision(decision, elements):
                    self._llm_failures = 0
                    return decision

                # JSON parsed but validation failed — try regex extraction
                if decision is None:
                    decision = _regex_extract_action(raw)
                    if decision and self._validate_decision(decision, elements):
                        self._llm_failures = 0
                        return decision

            except Exception as e:
                print(f"[Explorer] LLM error (attempt {attempt}): {e}", flush=True)
                # Don't count empty responses as hard failures
                if "Empty LLM response" not in str(e):
                    # Try regex extraction from raw before giving up
                    try:
                        if raw:
                            decision = _regex_extract_action(raw)
                            if decision and self._validate_decision(decision, elements):
                                self._llm_failures = 0
                                return decision
                    except Exception:
                        pass
                    self._llm_failures += 1

        # ---- Smarter fallback ----
        # If we're on a system dialog, try clicking an OK/Allow button
        screen_is_dialog = screen.get("is_system_dialog", False)
        if screen_is_dialog and elements:
            for el in elements:
                text = (el.get("text", "") or "").lower()
                if el.get("clickable") and el.get("enabled", True) and text in ("ok", "allow", "continue", "yes", "got it"):
                    center = el.get("center", [])
                    if len(center) == 2:
                        return {"action": "click", "target_index": el.get("index", 1),
                                "x": center[0], "y": center[1],
                                "reason": "Fallback — dismiss system dialog"}
            # Try clicking last clickable button on dialog
            clickable = [e for e in elements if e.get("clickable") and e.get("enabled", True)]
            if clickable:
                el = clickable[-1]
                center = el.get("center", [])
                if len(center) == 2:
                    return {"action": "click", "target_index": el.get("index", 1),
                            "x": center[0], "y": center[1],
                            "reason": "Fallback — click dialog button"}

        # If there are clickable elements, try the first one instead of pressing back
        if elements and self._llm_failures < self._cfg.llm_max_failures:
            for el in elements:
                if el.get("clickable") and el.get("enabled", True):
                    text = (el.get("text", "") or el.get("content_desc", "") or "").strip()
                    center = el.get("center", [])
                    if len(center) == 2:
                        return {"action": "click", "target_index": el.get("index", 1),
                                "x": center[0], "y": center[1],
                                "reason": f"Fallback — click '{text[:30]}'"}
            # Try swiping down (might reveal more content)
            return {"action": "swipe", "swipe_direction": "down",
                    "reason": "Fallback — swipe to discover content"}

        # Last resort: press back
        if self._llm_failures >= self._cfg.llm_max_failures:
            self._stop_reason = "llm_failure"
            return {"action": "done", "done": True, "reason": "LLM failed repeatedly"}
        return {"action": "press", "press_key": "back", "reason": "LLM fallback — go back"}

    def _validate_decision(self, decision: dict, elements: list[dict]) -> bool:
        """Check that the LLM's decision is safe and executable."""
        action = decision.get("action", "")
        if not action or action not in _VALID_ACTIONS:
            return False

        if action == "done":
            return True

        if action in ("click", "long_click", "input"):
            idx = decision.get("target_index")
            if idx is None or not isinstance(idx, (int, float)):
                return False
            idx = int(idx)
            if idx < 1 or idx > len(elements):
                return False
            if action == "input":
                text = decision.get("input_text", "")
                if not text or not isinstance(text, str):
                    return False

            # Build a human-readable target description for the journal
            try:
                el = elements[idx - 1]
                decision["target_desc"] = (
                    f"{el.get('class_name', '?')} "
                    f"\"{el.get('text') or el.get('content_desc') or el.get('resource_id', '?')}\""
                )
                # Convert element index → coordinates
                center = el.get("center", [])
                if len(center) == 2:
                    decision["x"] = center[0]
                    decision["y"] = center[1]
            except (IndexError, KeyError):
                pass

        if action == "swipe":
            direction = decision.get("swipe_direction", "")
            if direction not in _VALID_SWIPE_DIRS:
                return False

        if action == "press":
            key = decision.get("press_key", "")
            if key not in _VALID_PRESS_KEYS:
                return False

        if action == "launch_activity":
            act = decision.get("activity", "")
            declared = self._manifest.get("activities", [])
            # Must be a declared activity
            if not any(act in a for a in declared):
                return False

        if action == "wait":
            secs = decision.get("wait_seconds", 1)
            if not isinstance(secs, (int, float)) or secs < 0.1 or secs > 5:
                decision["wait_seconds"] = 1.5

        return True

    # ------------------------------------------------------------------
    # Action execution
    # ------------------------------------------------------------------

    def _execute_action(self, decision: dict, elements: list[dict], screen: dict) -> bool:
        """Execute the LLM's chosen action via the UI tool.  Emits SSE."""
        action = decision.get("action", "")
        reason = decision.get("reason", "")[:100]

        # Emit before execution
        self._emit("explorer_step", {
            "step": self._step_count,
            "action": action,
            "target_desc": decision.get("target_desc", ""),
            "reason": reason,
            "activity": screen.get("activity", ""),
        })

        try:
            if action in ("click", "long_click"):
                x = decision.get("x")
                y = decision.get("y")
                if x is not None and y is not None:
                    result = self._ui.execute(
                        action=action, x=int(x), y=int(y),
                        target_package=self._package,
                    )
                    self._emit("explorer_action", {
                        "step": self._step_count,
                        "action": action,
                        "success": result.get("success", False),
                        "summary": f"{action.title()}ed {decision.get('target_desc', f'({x},{y})')}",
                    })
                    return result.get("success", False)

            elif action == "input":
                x = decision.get("x")
                y = decision.get("y")
                text = decision.get("input_text", "")
                if x is not None and y is not None:
                    result = self._ui.execute(
                        action="input", x=int(x), y=int(y),
                        text=str(text), target_package=self._package,
                    )
                    self._emit("explorer_action", {
                        "step": self._step_count,
                        "action": "input",
                        "success": result.get("success", False),
                        "summary": f"Typed \"{text[:30]}\" into {decision.get('target_desc', f'({x},{y})')}",
                    })
                    return result.get("success", False)

            elif action == "swipe":
                direction = decision.get("swipe_direction", "up")
                result = self._ui.execute(action="swipe", direction=direction)
                self._emit("explorer_action", {
                    "step": self._step_count,
                    "action": "swipe",
                    "success": result.get("success", False),
                    "summary": f"Swiped {direction}",
                })
                return result.get("success", False)

            elif action == "press":
                key = decision.get("press_key", "back")
                result = self._ui.execute(action="press", key=key)
                self._emit("explorer_action", {
                    "step": self._step_count,
                    "action": "press",
                    "success": result.get("success", False),
                    "summary": f"Pressed {key}",
                })
                return result.get("success", False)

            elif action == "wait":
                secs = float(decision.get("wait_seconds", 1.5))
                time.sleep(min(secs, 5.0))
                return True

            elif action == "launch_activity":
                activity = decision.get("activity", "")
                # Use ADB to launch the activity
                import subprocess
                subprocess.run(
                    ["adb", "shell", "am", "start", "-n", f"{self._package}/{activity}"],
                    capture_output=True, timeout=10,
                )
                return True

        except Exception as e:
            print(f"[Explorer] Action execution error: {e}", flush=True)
            return False

        return False

    # ------------------------------------------------------------------
    # App lifecycle
    # ------------------------------------------------------------------

    def _launch_app(self):
        """Launch the target app via ADB monkey."""
        try:
            import subprocess
            subprocess.run(
                ["adb", "shell", "monkey", "-p", self._package,
                 "-c", "android.intent.category.LAUNCHER", "1"],
                capture_output=True, timeout=10,
            )
            time.sleep(2)
        except Exception:
            pass

    def _check_app_alive(self):
        """Check if the app is still in the foreground.  Relaunch if dead.

        Improvements over the naive version:
        - Force-stops interfering packages (e.g. Expo Go) before relaunching
        - Cooldown prevents rapid-fire relaunch storms
        - Resets dismissed-dialog counters on relaunch
        """
        try:
            info_result = self._ui.execute(action="info")
            if not info_result.get("success"):
                return
            current_pkg = info_result.get("current_package", "")

            # Is the app gone?
            if current_pkg and current_pkg != self._package:
                if current_pkg in _LAUNCHER_PACKAGES or not current_pkg.startswith(self._package):
                    # Cooldown: don't relaunch if we just did
                    now = time.time()
                    if now - self._last_relaunch_time < RELAUNCH_COOLDOWN:
                        return

                    if self._relaunch_count < self._cfg.relaunch_attempts:
                        self._relaunch_count += 1
                        self._last_relaunch_time = now
                        print(f"[Explorer] App left foreground (now: {current_pkg}). "
                              f"Relaunch {self._relaunch_count}/{self._cfg.relaunch_attempts}...", flush=True)

                        # Force-stop the interfering package so it doesn't steal focus again.
                        # NEVER force-stop launchers or system UI — that causes Google
                        # Search / QSB to open instead, making things worse.
                        _NEVER_FORCE_STOP = frozenset({
                            "com.android.systemui",
                            "com.android.launcher", "com.android.launcher3",
                            "com.google.android.apps.nexuslauncher",
                            "com.google.android.googlequicksearchbox",
                            "com.android.settings",
                        })
                        if current_pkg and current_pkg not in _NEVER_FORCE_STOP:
                            try:
                                import subprocess
                                subprocess.run(
                                    ["adb", "shell", "am", "force-stop", current_pkg],
                                    capture_output=True, timeout=5,
                                )
                                print(f"[Explorer] Force-stopped {current_pkg}", flush=True)
                            except Exception:
                                pass

                        # Press back to dismiss any system dialog
                        self._ui.execute(action="press", key="back")
                        time.sleep(0.5)
                        self._launch_app()

                        # Reset dialog dismiss counters for fresh session
                        self._dismissed_dialog_counts.clear()

                        # Dismiss any dialogs that appear after relaunch
                        time.sleep(1)
                        for _ in range(3):
                            if not self._dismiss_system_dialogs():
                                break
                            time.sleep(0.4)
                    else:
                        self._stop_reason = "app_crashed"
        except Exception as e:
            print(f"[Explorer] App-alive check failed: {e}", flush=True)

    def _dismiss_system_dialogs(self) -> bool:
        """Detect and dismiss any system dialog blocking the app.

        Returns True if a dialog was found and dismissed, False otherwise.
        Handles: "app made for older version", ANR dialogs, permission prompts.

        Anti-loop: tracks how many times each button text has been dismissed.
        If the same button has been clicked 2+ times, it's a loop — skip it
        and press BACK instead (breaks the Autofill Credentials cycle).
        """
        try:
            dump = self._ui.execute(action="dump", target_package=self._package)
            if not dump.get("success"):
                return False

            screen = dump.get("screen", {})
            if not screen.get("is_system_dialog"):
                return False

            elements = dump.get("elements", [])
            if not elements:
                return False

            # Find the best button to click: prefer OK/Allow/Continue, avoid Deny/Cancel
            _POSITIVE_TEXTS = {"ok", "allow", "continue", "yes", "got it", "close"}
            ok_button = None
            for el in elements:
                text = (el.get("text", "") or el.get("content_desc", "")).lower()
                if text in _POSITIVE_TEXTS:
                    ok_button = el
                    break

            # Fallback: click the last clickable button (usually positive action)
            if not ok_button:
                clickable = [e for e in elements if e.get("clickable") and e.get("enabled", True)]
                if clickable:
                    ok_button = clickable[-1]  # last button is typically OK/Allow

            if ok_button:
                btn_text = (ok_button.get("text", "") or ok_button.get("content_desc", "?")).strip()
                btn_key = btn_text.lower()

                # Anti-loop: if we've dismissed this exact button 2+ times, break the cycle
                prev_count = self._dismissed_dialog_counts.get(btn_key, 0)
                if prev_count >= 2:
                    print(f"[Explorer] Dialog loop detected ('{btn_text}' dismissed {prev_count}x). "
                          f"Giving up on this dialog.", flush=True)
                    # DON'T press BACK — that exits the app when there's one activity.
                    # Just stop trying.  The LLM will handle the dialog if it persists.
                    self._dismissed_dialog_counts[btn_key] = 0
                    return False  # signal "no more dialogs" to break caller's loop

                center = ok_button.get("center", [])
                if len(center) == 2:
                    print(f"[Explorer] Dismissing system dialog: clicking '{btn_text}'", flush=True)
                    self._ui.execute(action="click", x=center[0], y=center[1])
                    self._dismissed_dialog_counts[btn_key] = prev_count + 1
                    return True

        except Exception as e:
            print(f"[Explorer] Dialog dismissal error: {e}", flush=True)

        return False


    def _get_current_activity(self) -> str:
        """Get the current activity short name."""
        try:
            info = self._ui.execute(action="info")
            return info.get("current_activity", "")
        except Exception:
            return ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hash_element_dicts(elements: list[dict]) -> str:
    """Produce a hash from element dicts for stall detection."""
    import hashlib
    parts = []
    for el in elements[:20]:  # top 20 elements is enough
        rid = el.get("resource_id", "")
        bounds = el.get("bounds", [0, 0, 0, 0])
        text = el.get("text", "")
        parts.append(f"{rid}|{bounds}|{text}")
    raw = "\n".join(parts)
    return hashlib.sha256(raw.encode()).hexdigest()[:12]


def _repair_json(raw: str) -> str:
    """Repair common LLM JSON formatting issues before parsing.

    Handles:
    - Stray quotes before keys: ``" "key":`` → ``"key":``
    - Smart/curly quotes → straight quotes
    - Leading/trailing noise outside braces
    - Missing closing brace (appends one)
    """
    import re

    # Replace smart/curly quotes with straight quotes
    raw = raw.replace("“", '"').replace("”", '"')
    raw = raw.replace("‘", "'").replace("’", "'")

    # Fix stray quote-space-quote before keys:  " "key":  →  "key":
    raw = re.sub(r'"\s+"(\w)',
                 lambda m: f'"{m.group(1)}', raw)

    # Extract the outermost {...} block
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1 and end > start:
        raw = raw[start:end + 1]
    elif start != -1 and end == -1:
        # Missing closing brace — try to append one
        raw = raw[start:] + "}"

    # Balance braces
    open_count = raw.count("{")
    close_count = raw.count("}")
    if open_count > close_count:
        raw += "}" * (open_count - close_count)

    return raw


def _regex_extract_action(raw: str) -> dict | None:
    """Last-resort extraction of action fields from truncated LLM JSON.

    When the JSON is too broken for ``json.loads`` even after repair,
    we use regex to extract the ``action`` and ``target_index`` fields
    so the explorer can still make progress instead of falling back
    to blind clicking.
    """
    import re

    action_match = re.search(r'"action"\s*:\s*"(\w+)"', raw)
    if not action_match:
        return None

    action = action_match.group(1)
    result = {"action": action, "reason": "Regex fallback from truncated JSON"}

    # Extract target_index
    idx_match = re.search(r'"target_index"\s*:\s*(\d+)', raw)
    if idx_match:
        result["target_index"] = int(idx_match.group(1))

    # Extract input_text
    input_match = re.search(r'"input_text"\s*:\s*"([^"]*)"', raw)
    if input_match:
        result["input_text"] = input_match.group(1)

    # Extract swipe_direction
    swipe_match = re.search(r'"swipe_direction"\s*:\s*"(\w+)"', raw)
    if swipe_match:
        result["swipe_direction"] = swipe_match.group(1)

    # Extract press_key
    key_match = re.search(r'"press_key"\s*:\s*"(\w+)"', raw)
    if key_match:
        result["press_key"] = key_match.group(1)

    return result
