import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  ArrowUp,
  Paperclip,
  MessagesSquare,
  ChevronRight,
  Check,
  Loader2,
  CircleDot,
  ChevronDown,
  Hexagon,
  Trash2,
  Zap,
  Shield,
  Bot,
  Copy,
  CheckCheck,
  Pencil,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export const Route = createFileRoute("/_argus/")({
  head: () => ({ meta: [{ title: "ARGUS" }] }),
  component: Home,
});

// ---------- types ----------
type AgentStatus = "pending" | "running" | "done";
type Agent = {
  id: string;
  name: string;
  status: AgentStatus;
  duration?: number;
  summary?: string;
};
type TimelineEntry = {
  id: string;
  label: string;
  status: "running" | "done";
  ts: number;
};
type ChatMsg = { role: "user" | "assistant"; text: string; id: string };
type FindingEntry = {
  evidence: string;
  source_file?: string;
  interpretation: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  runtime_validation: "NOT_TESTED" | "OBSERVED" | "VALIDATED";
  mitre_technique?: string;
  event_type?: string;
  timestamp?: string;
};
type AgentFinding = {
  summary: string;
  detail?: string;
  findings?: FindingEntry[];
  observed_events?: { event_type: string; evidence: string; timestamp: string; interpretation: string }[];
  observation_window_seconds?: number;
  hooks_triggered?: number;
  hooks_silent?: number;
};
type Correlation = {
  capability: string;
  static_evidence: string;
  dynamic_evidence: string;
  status: "VALIDATED" | "NOT_VALIDATED" | "NOT_TESTED";
  risk_assessment: string;
};
type Report = {
  fileName: string;
  permissionScore: number;
  highRisk: string[];
  apiCalls: { api: string; description: string; file: string; is_library?: boolean }[];
  pipelineStatus: {
    apktool: { success: boolean; message: string };
    jadx: { success: boolean; message: string };
    sandbox: { success: boolean; message: string };
  };
  verdict: "benign" | "suspicious" | "high-risk" | "malicious";
  confidence: number;
  confidenceBreakdown?: string;
  executiveSummary?: string;
  analystSummary?: string;
  recommendedActions?: string;
  mitreTechniques?: string[];
  agentFindings?: Record<string, AgentFinding>;
  correlations?: Correlation[];
  analysisScope?: "static_only" | "static_and_dynamic" | "autonomous_dynamic";
  exploration?: {
    total_steps: number;
    activities_visited: string[];
    screens_explored: number;
    elements_touched: number;
    stop_reason: string;
    frida_events_total?: number;
  };
  package?: string;
  osint?: {
    virustotal?: {
      found?: boolean;
      skipped?: boolean;
      detection_ratio?: number;
      detection_count?: number;
      engine_count?: number;
      known_malicious?: boolean;
      family_tags?: string[];
      first_seen?: number;
    };
    malwarebazaar?: {
      found?: boolean;
      malware_family?: string;
      bazaar_tags?: string[];
      first_seen?: string;
    };
  };
  yaraRule?: string;
  yaraRuleName?: string;
} | null;

type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMsg[];
  timeline: TimelineEntry[];
  agents: Agent[];
  report: Report;
  status: "idle" | "analyzing" | "complete" | "error";
  currentFile?: string;
  jobId?: string;  // Phase 3: backend job UUID
};

// ---------- defaults ----------
const AGENT_TEMPLATE: Omit<Agent, "status">[] = [
  { id: "perm", name: "Permission Agent" },
  { id: "code", name: "Code Agent" },
  { id: "behavior", name: "Behavior Agent" },
  { id: "network", name: "Network Agent" },
  { id: "threat", name: "Threat Intelligence Agent" },
  { id: "consensus", name: "Consensus Agent" },
];


const newId = () => Math.random().toString(36).slice(2, 10);

/** Emoji for explorer action types shown in the timeline. */
const _stepEmoji = (action: string): string => {
  switch (action) {
    case "click": return "👆";
    case "long_click": return "👆⏳";
    case "input": return "⌨️";
    case "swipe": return "👈";
    case "press": return "↩️";
    case "wait": return "⏳";
    case "launch_activity": return "🚀";
    case "done": return "✅";
    default: return "🔍";
  }
};

const makeConversation = (title = "New analysis"): Conversation => ({
  id: newId(),
  title,
  createdAt: Date.now(),
  messages: [],
  timeline: [],
  agents: AGENT_TEMPLATE.map((a) => ({ ...a, status: "pending" })),
  report: null,
  status: "idle",
});

// ---------- component ----------
export function Home() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    // Try to restore from localStorage on first render
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("argus_conversations");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [makeConversation("Untitled analysis")];
  });

  const [activeId, setActiveId] = useState<string>(() => {
    // Try to restore activeId from localStorage on first render
    if (typeof window !== "undefined") {
      const savedId = localStorage.getItem("argus_activeId");
      if (savedId) return savedId;
    }
    return "";
  });

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("argus_conversations", JSON.stringify(conversations));
    }
  }, [conversations, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("argus_activeId", activeId);
    }
  }, [activeId, isMounted]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [input, setInput] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"full" | "dynamic_only" | "autonomous">("full");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeId && conversations[0]) setActiveId(conversations[0].id);
  }, [activeId, conversations]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [conversations, activeId],
  );

  const updateActive = useCallback(
    (patch: (c: Conversation) => Conversation) => {
      setConversations((list) => list.map((c) => (c.id === activeId ? patch(c) : c)));
    },
    [activeId],
  );

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active?.messages.length, active?.timeline.length, active?.report]);

  // ---------- upload — real-time SSE progress ----------
  const startUpload = async (file: File) => {
    const convId = activeId;
    updateActive((c) => ({
      ...c,
      title: c.messages.length === 0 && c.title.startsWith("Untitled") ? file.name.replace(/\.apk$/i, "") : c.title,
      status: "analyzing",
      currentFile: file.name,
      messages: [...c.messages, { id: newId(), role: "user", text: `Analyze ${file.name}` }],
      timeline: [],
      agents: AGENT_TEMPLATE.map((a) => ({ ...a, status: "pending" })),
      report: null,
    }));

    // Helpers that always write into the correct conversation slot
    const pushTimelineStep = (label: string, stepId: string, stepStatus: "running" | "done") => {
      setConversations((list) =>
        list.map((c) => {
          if (c.id !== convId) return c;
          const existing = c.timeline.find((t) => t.id === stepId);
          if (existing) {
            // Update the existing step's status
            return {
              ...c,
              timeline: c.timeline.map((t) =>
                t.id === stepId ? { ...t, status: stepStatus } : t,
              ),
            };
          }
          // Mark previous running step as done, add new one
          return {
            ...c,
            timeline: [
              ...c.timeline.map((t) =>
                t.status === "running" ? { ...t, status: "done" as const } : t,
              ),
              { id: stepId, label, status: stepStatus, ts: Date.now() },
            ],
          };
        }),
      );
    };

    const setAgentStatus = (agentId: string, status: AgentStatus, summary?: string) => {
      if (!agentId) return;
      setConversations((list) =>
        list.map((c) =>
          c.id !== convId
            ? c
            : { ...c, agents: c.agents.map((a) => (a.id === agentId ? { ...a, status, summary } : a)) },
        ),
      );
    };

    const markAllDone = () => {
      setConversations((list) =>
        list.map((c) =>
          c.id !== convId
            ? c
            : {
                ...c,
                timeline: c.timeline.map((t) => ({ ...t, status: "done" as const })),
                agents: c.agents.map((a) => (a.status === "running" ? { ...a, status: "done" } : a)),
              },
        ),
      );
    };

    // Use FormData + fetch to upload, then parse SSE from the response body
    const form = new FormData();
    form.append("file", file);
    form.append("mode", analysisMode);

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let aborted = false;

    try {
      const response = await fetch("http://localhost:5050/analyze/stream", {
        method: "POST",
        body: form,
      });

      if (!response.ok || !response.body) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error((errJson as { error?: string }).error ?? "Analysis failed");
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // SSE parser: accumulate chunks, split on double-newline frames
      const parseFrames = (chunk: string): Array<{ event: string; data: string }> => {
        const frames: Array<{ event: string; data: string }> = [];
        const rawFrames = chunk.split(/\n\n/);
        for (const raw of rawFrames) {
          if (!raw.trim()) continue;
          let event = "message";
          let data = "";
          for (const line of raw.split(/\n/)) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data = line.slice(5).trim();
          }
          if (data) frames.push({ event, data });
        }
        return frames;
      };

      // Process SSE stream
      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process complete frames (split on \n\n)
        const splitIdx = buffer.lastIndexOf("\n\n");
        if (splitIdx === -1) continue;
        const complete = buffer.slice(0, splitIdx + 2);
        buffer = buffer.slice(splitIdx + 2);

        for (const { event, data } of parseFrames(complete)) {
          // Keep-alive pings start with ":"
          if (data === "" || event === "") continue;

          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(data);
          } catch {
            continue;
          }

          // ---- Map SSE events to UI state ----
          if (event === "tool_start") {
            const label = (payload.label as string) || (payload.tool as string);
            const stepId = payload.tool as string;
            const agentId = payload.agent as string;
            pushTimelineStep(label, stepId, "running");
            if (agentId) setAgentStatus(agentId, "running");
          }

          else if (event === "tool_done") {
            const stepId = payload.tool as string;
            const agentId = payload.agent as string;
            const summary = payload.summary as string | undefined;
            pushTimelineStep("", stepId, "done");
            // Only mark agent done when we have a summary (stays "running" until consensus)
          }

          else if (event === "planner_thinking") {
            const stepId = `thinking-${payload.iteration}`;
            pushTimelineStep("Agent reasoning…", stepId, "running");
          }

          else if (event === "planner_decision") {
            const stepId = `thinking-${payload.iteration}`;
            const reason = (payload.reason as string) || "Next step selected";
            // Replace "thinking" step with the actual decision label
            setConversations((list) =>
              list.map((c) =>
                c.id !== convId
                  ? c
                  : {
                      ...c,
                      timeline: c.timeline.map((t) =>
                        t.id === stepId
                          ? { ...t, label: reason.length > 60 ? reason.slice(0, 57) + "…" : reason, status: "done" as const }
                          : t,
                      ),
                    },
              ),
            );
            // Mark network agent running during planner calls (it handles threat intelligence)
            setAgentStatus("network", "running");
            setAgentStatus("threat", "running");
          }

          // ---- Autonomous explorer events ----
          else if (event === "explorer_start") {
            const msg = `🤖 LLM exploring app UI (max ${payload.max_steps} steps, ${payload.max_seconds}s)`;
            const stepId = "explorer-start";
            pushTimelineStep(msg, stepId, "running");
            setAgentStatus("behavior", "running");
          }

          else if (event === "explorer_step") {
            const step = payload.step as number;
            const action = payload.action as string;
            const reason = (payload.reason as string) || "";
            const stepId = `explorer-${step}`;
            const label = `${_stepEmoji(action)} ${action} #${step} — ${reason.slice(0, 45)}${reason.length > 45 ? "…" : ""}`;
            pushTimelineStep(label, stepId, "running");
          }

          else if (event === "explorer_action") {
            const step = payload.step as number;
            const stepId = `explorer-${step}`;
            const summary = (payload.summary as string) || "";
            setConversations((list) =>
              list.map((c) =>
                c.id !== convId
                  ? c
                  : {
                      ...c,
                      timeline: c.timeline.map((t) =>
                        t.id === stepId
                          ? { ...t, label: summary.length > 66 ? summary.slice(0, 63) + "…" : summary, status: "done" as const }
                          : t,
                      ),
                    },
              ),
            );
          }

          else if (event === "explorer_done") {
            const stepId = "explorer-start";
            const screens = payload.screens_visited as number;
            const steps = payload.total_steps as number;
            const reason = payload.stop_reason as string;
            setConversations((list) =>
              list.map((c) =>
                c.id !== convId
                  ? c
                  : {
                      ...c,
                      timeline: c.timeline.map((t) =>
                        t.id === stepId
                          ? { ...t, label: `🤖 Exploration complete: ${steps} steps, ${screens} screens (${reason})`, status: "done" as const }
                          : t,
                      ),
                    },
              ),
            );
            setAgentStatus("behavior", "done");
          }

          else if (event === "consensus_start") {
            const stepId = "consensus";
            pushTimelineStep("Generating verdict", stepId, "running");
            setAgentStatus("consensus", "running");
          }

          else if (event === "status") {
            // First event carries job_id from Phase 3 backend
            const serverJobId = payload.job_id as string | undefined;
            if (serverJobId) {
              setConversations((list) =>
                list.map((c) => c.id === convId ? { ...c, jobId: serverJobId } : c)
              );
            }
          }

          else if (event === "result") {
            // Final result — parse and build the report exactly like before
            const result = payload as Record<string, unknown>;
            markAllDone();

            const highRisk: string[] = (result.high_risk_permissions as string[]) ?? [];
            const score: number = (result.permission_score_percent as number) ?? 0;
            const apiCalls = (result.api_calls as { api: string; description: string; file: string; is_library?: boolean }[]) ?? [];
            const pipelineStatus = (result.pipeline_status as { apktool: { success: boolean; message: string }; jadx: { success: boolean; message: string }; sandbox: { success: boolean; message: string } }) ?? {
              apktool: { success: false, message: "Not run" },
              jadx: { success: false, message: "Not run" },
              sandbox: { success: false, message: "Not run" },
            };
            const verdict = (result.verdict as "benign" | "suspicious" | "high-risk" | "malicious") ??
              (score > 70 ? "high-risk" : score > 40 ? "suspicious" : "benign");
            const confidence: number = (result.confidence as number) ?? Math.min(99, 60 + Math.round(score / 3));
            const agentFindings = result.agent_findings as Record<string, AgentFinding> | undefined;

            const fallbackSummaries: Record<string, string> = {
              perm: `${highRisk.length} high-risk permissions`,
              code: "Static scan complete",
              behavior: "No anomalous runtime patterns",
              network: "Outbound traffic profile captured",
              threat: "Correlated against intel feeds",
              consensus: `Verdict: ${verdict}`,
            };
            AGENT_TEMPLATE.forEach((a) => {
              const finding = agentFindings?.[a.id];
              setAgentStatus(a.id, "done", finding?.summary ?? fallbackSummaries[a.id]);
            });

            setConversations((list) =>
              list.map((c) =>
                c.id !== convId
                  ? c
                  : {
                      ...c,
                      status: "complete",
                      timeline: c.timeline.map((t) => ({ ...t, status: "done" as const })),
                      report: {
                        fileName: file.name,
                        permissionScore: score,
                        highRisk,
                        apiCalls,
                        pipelineStatus,
                        verdict,
                        confidence,
                        confidenceBreakdown: result.confidence_breakdown as string,
                        executiveSummary: result.executive_summary as string,
                        analystSummary: result.analyst_summary as string,
                        recommendedActions: result.recommended_actions as string,
                        mitreTechniques: result.mitre_techniques as string[],
                        agentFindings,
                        correlations: result.correlations as Correlation[],
                        analysisScope: result.analysis_scope as "static_only" | "static_and_dynamic" | "autonomous_dynamic",
                        exploration: result.exploration as Report extends null ? never : NonNullable<Report>["exploration"],
                        package: result.package as string,
                        osint: result.osint as Report extends null ? never : NonNullable<Report>["osint"],
                        yaraRule: result.yara_rule as string | undefined,
                        yaraRuleName: result.yara_rule_name as string | undefined,
                      },
                      messages: [
                        ...c.messages,
                        {
                          id: newId(),
                          role: "assistant",
                          text: result.executive_summary
                            ? `Analysis complete. ${result.executive_summary as string}`
                            : `Analysis complete. Verdict: ${verdict}. ${highRisk.length} high-risk permissions detected. See report below — ask follow-ups anytime.`,
                        },
                      ],
                    },
              ),
            );
            break; // stream is done
          }

          else if (event === "error") {
            throw new Error((payload.message as string) ?? "Analysis failed");
          }
        }
      }
    } catch (err) {
      aborted = true;
      reader?.cancel().catch(() => {});
      setConversations((list) =>
        list.map((c) =>
          c.id !== convId
            ? c
            : {
                ...c,
                status: "error",
                messages: [
                  ...c.messages,
                  {
                    id: newId(),
                    role: "assistant",
                    text: err instanceof Error ? `Analysis failed: ${err.message}` : "Analysis failed.",
                  },
                ],
              },
        ),
      );
    }
  };


  const submitChat = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    // Add user message immediately
    const thinkingId = newId();
    updateActive((c) => ({
      ...c,
      messages: [
        ...c.messages,
        { id: newId(), role: "user", text },
        { id: thinkingId, role: "assistant", text: "__THINKING__" },
      ],
    }));

    if (active?.status !== "complete" || !active?.report) {
      // No report — give a static answer
      setConversations((list) =>
        list.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === thinkingId
                    ? { ...m, text: active?.status === "analyzing"
                        ? "Analysis is still running. I'll have a complete answer once the agents converge."
                        : "Upload an APK with the **+** button and I'll begin a multi-agent analysis." }
                    : m,
                ),
              }
            : c,
        ),
      );
      return;
    }

    try {
      // Build conversation history from previous messages (excluding the current thinking placeholder)
      const history = active.messages
        .filter((m) => m.text !== "__THINKING__")
        .map((m) => ({ role: m.role, content: m.text }));

      const resp = await fetch("http://localhost:5050/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          report_context: active.report,
          conversation_history: history,
          job_id: active.jobId ?? "",
        }),
      });
      const data = await resp.json();
      const answer = data.answer ?? "Sorry, I couldn't generate a response.";
      setConversations((list) =>
        list.map((c) =>
          c.id === activeId
            ? { ...c, messages: c.messages.map((m) => (m.id === thinkingId ? { ...m, text: answer } : m)) }
            : c,
        ),
      );
    } catch {
      setConversations((list) =>
        list.map((c) =>
          c.id === activeId
            ? { ...c, messages: c.messages.map((m) => (m.id === thinkingId ? { ...m, text: "Sorry, I couldn't reach the analysis server." } : m)) }
            : c,
        ),
      );
    }
  };

  const newConversation = () => {
    const conv = makeConversation("Untitled analysis");
    setConversations((list) => [conv, ...list]);
    setActiveId(conv.id);
    setDrawerOpen(false);
  };

  const clearAllData = () => {
    if (!window.confirm("Clear all conversations and cached data? This cannot be undone.")) return;
    localStorage.removeItem("argus_conversations");
    localStorage.removeItem("argus_activeId");
    const fresh = makeConversation("Untitled analysis");
    setConversations([fresh]);
    setActiveId(fresh.id);
    setDrawerOpen(false);
  };

  const deleteConversation = (id: string) => {
    setConversations((list) => {
      const next = list.filter((c) => c.id !== id);
      if (next.length === 0) {
        const fresh = makeConversation("Untitled analysis");
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) {
        setActiveId(next[0].id);
      }
      return next;
    });
  };

  // ---------- inline rename state ----------
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle);
  };

  const commitRename = () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (trimmed) {
      setConversations((list) =>
        list.map((c) => (c.id === renamingId ? { ...c, title: trimmed } : c)),
      );
    }
    setRenamingId(null);
    setRenameValue("");
  };


  if (!active) return null;
  const hasContent = active.messages.length > 0;

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0a0a0c] text-neutral-200">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
        <div className="flex items-center gap-2.5">
          <Hexagon size={15} className="text-neutral-400" strokeWidth={1.5} />
          <span className="text-[13px] font-medium tracking-wide text-neutral-200">ARGUS</span>
          <span className="text-[11px] text-neutral-500">/ {active.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
          >
            <MessagesSquare size={13} strokeWidth={1.5} />
            Conversations
          </button>
          <button
            onClick={newConversation}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
            title="New conversation"
          >
            <Plus size={13} strokeWidth={1.5} />
            New
          </button>
        </div>
      </header>

      {/* Conversation drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/40"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: -260, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -260, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              className="fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-white/[0.06] bg-[#0c0c10] p-3"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-[11px] uppercase tracking-wider text-neutral-500">Conversations</span>
                <button
                  onClick={newConversation}
                  className="rounded p-1 text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
                >
                  <Plus size={13} />
                </button>
              </div>
              <div className="flex-1 space-y-0.5 overflow-auto">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={`group relative flex items-center rounded transition ${
                    c.id === activeId
                      ? "bg-white/[0.05]"
                      : "hover:bg-white/[0.03]"
                  }`}
                >
                  {renamingId === c.id ? (
                    // ---- inline rename input ----
                    <input
                      id={`rename-input-${c.id}`}
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                      }}
                      className="w-full flex-1 rounded bg-white/[0.06] px-2 py-1.5 text-[12px] text-neutral-100 outline-none ring-1 ring-white/10 focus:ring-cyan-500/40"
                    />
                  ) : (
                    // ---- normal row ----
                    <button
                      onClick={() => { setActiveId(c.id); setDrawerOpen(false); }}
                      className={`flex flex-1 items-center gap-2 px-2 py-1.5 text-left text-[12px] ${
                        c.id === activeId ? "text-neutral-100" : "text-neutral-400 group-hover:text-neutral-200"
                      }`}
                    >
                      <span className="flex-1 truncate">{c.title}</span>
                      {c.status === "analyzing" && (
                        <Loader2 size={11} className="shrink-0 animate-spin text-neutral-500" />
                      )}
                    </button>
                  )}

                  {/* action icons — visible on hover or when active */}
                  {renamingId !== c.id && (
                    <div className={`flex items-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100 ${
                      c.id === activeId ? "opacity-100" : ""
                    }`}>
                      <button
                        id={`rename-btn-${c.id}`}
                        onClick={(e) => { e.stopPropagation(); startRename(c.id, c.title); }}
                        title="Rename"
                        className="rounded p-1 text-neutral-600 hover:bg-white/[0.06] hover:text-neutral-300 transition"
                      >
                        <Pencil size={11} strokeWidth={1.5} />
                      </button>
                      <button
                        id={`delete-btn-${c.id}`}
                        onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                        title="Delete conversation"
                        className="rounded p-1 text-neutral-600 hover:bg-red-500/10 hover:text-red-400 transition"
                      >
                        <X size={11} strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              </div>
              <div className="mt-2 border-t border-white/[0.06] pt-2">
                <button
                  onClick={clearAllData}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] text-red-400/70 hover:bg-red-500/10 hover:text-red-300 transition"
                  title="Clear all conversations & cache"
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                  Clear all data
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main workspace */}
      <main className="flex flex-1 flex-col items-center overflow-hidden">
        <div ref={scrollRef} className="w-full flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-6 py-10">
            {!hasContent ? (
              <EmptyState />
            ) : (
              <div className="space-y-8">
                {/* Initial analysis message (first message from upload) */}
                {active.messages.length > 0 && (
                  active.messages[0].role === "user" ? (
                    <UserMessage key={active.messages[0].id} text={active.messages[0].text} />
                  ) : (
                    <AssistantMessage key={active.messages[0].id} text={active.messages[0].text} />
                  )
                )}

                {(active.status === "analyzing" || active.timeline.length > 0) && (
                  <ActivityStream timeline={active.timeline} agents={active.agents} status={active.status} />
                )}

                {active.report && <ReportView report={active.report} />}

                {/* Follow-up chat messages — rendered AFTER the report so they're visible at the bottom */}
                {active.messages.length > 1 && active.messages.slice(1).map((m) =>
                  m.role === "user" ? (
                    <UserMessage key={m.id} text={m.text} />
                  ) : (
                    <AssistantMessage key={m.id} text={m.text} />
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="w-full shrink-0 border-t border-white/[0.06] bg-[#0a0a0c]/95 backdrop-blur">
          <div className="mx-auto w-full max-w-3xl px-6 py-4">

            {/* Analysis mode selector — 3 pills */}
            <div className="mb-2.5 flex items-center gap-1.5">
              {(["full", "dynamic_only", "autonomous"] as const).map((mode) => {
                const isActive = analysisMode === mode;
                const icon =
                  mode === "autonomous" ? (
                    <Bot size={11} strokeWidth={1.5} />
                  ) : mode === "dynamic_only" ? (
                    <Zap size={11} strokeWidth={2} />
                  ) : (
                    <Shield size={11} strokeWidth={1.5} />
                  );
                const label =
                  mode === "autonomous"
                    ? "Deep Dive"
                    : mode === "dynamic_only"
                    ? "Dynamic Only"
                    : "Full Analysis";
                const activeClass =
                  mode === "autonomous"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.18)]"
                    : mode === "dynamic_only"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                    : "border-indigo-500/40 bg-indigo-500/10 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.15)]";
                const idleClass =
                  "border-white/[0.07] bg-white/[0.02] text-neutral-500 hover:border-white/[0.12] hover:text-neutral-300";
                return (
                  <button
                    key={mode}
                    id={`mode-${mode}`}
                    onClick={() => setAnalysisMode(mode)}
                    title={`Switch to ${label}`}
                    className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ${
                      isActive ? activeClass : idleClass
                    }`}
                  >
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
              {analysisMode === "dynamic_only" && (
                <span className="text-[10px] text-amber-500/70">
                  ⚡ Requires connected emulator · Skips static analysis
                </span>
              )}
              {analysisMode === "autonomous" && (
                <span className="text-[10px] text-emerald-500/70">
                  🤖 Requires connected emulator · LLM-guided UI exploration
                </span>
              )}
            </div>

            <div className="flex items-end gap-2 rounded-xl border border-white/[0.08] bg-[#101014] px-3 py-2.5 focus-within:border-white/20">
              <button
                onClick={() => fileRef.current?.click()}
                title="Attach APK"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200"
              >
                <Plus size={15} strokeWidth={1.5} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".apk"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void startUpload(f);
                  e.target.value = "";
                }}
              />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitChat();
                  }
                }}
                rows={1}
                placeholder="Ask ARGUS or attach an APK…"
                className="max-h-40 flex-1 resize-none bg-transparent py-1 text-[13px] leading-6 text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
              />
              <button
                onClick={submitChat}
                disabled={!input.trim()}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-200 text-neutral-900 transition hover:bg-white disabled:bg-white/10 disabled:text-neutral-500"
              >
                <ArrowUp size={14} strokeWidth={2} />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-neutral-600">
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    active.status === "analyzing"
                      ? "bg-amber-400"
                      : active.status === "error"
                        ? "bg-red-400"
                        : active.status === "complete"
                          ? "bg-emerald-400"
                          : "bg-neutral-600"
                  }`}
                />
                {active.status === "analyzing"
                  ? "Agents working"
                  : active.status === "complete"
                    ? "Analysis ready"
                    : active.status === "error"
                      ? "Error"
                      : "Idle"}
              </span>
              <span>Press Enter to send · Shift+Enter for newline</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------- subcomponents ----------
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-[60vh] flex-col items-center justify-center text-center"
    >
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02]">
        <Hexagon size={18} className="text-neutral-400" strokeWidth={1.5} />
      </div>
      <h1 className="text-[22px] font-medium tracking-tight text-neutral-100">What should ARGUS analyze?</h1>
      <p className="mt-2 max-w-md text-[13px] leading-6 text-neutral-500">
        Attach an APK to start a multi-agent investigation, or ask a question about a prior sample.
      </p>
    </motion.div>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-end"
    >
      <div className="max-w-[80%] rounded-lg bg-white/[0.06] px-3.5 py-2 text-[13px] leading-6 text-neutral-100">
        {text}
      </div>
    </motion.div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-neutral-400 transition hover:bg-white/[0.08] hover:text-neutral-200"
      title="Copy code"
    >
      {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 py-2"
    >
      <div className="flex items-center gap-1.5">
        <motion.div
          className="h-1.5 w-1.5 rounded-full bg-indigo-400"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="h-1.5 w-1.5 rounded-full bg-indigo-400"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="h-1.5 w-1.5 rounded-full bg-indigo-400"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      <span className="text-[12px] text-neutral-500">ARGUS is thinking…</span>
    </motion.div>
  );
}

function AssistantMessage({ text }: { text: string }) {
  if (text === "__THINKING__") {
    return <ThinkingIndicator />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="argus-markdown text-[13px] leading-7 text-neutral-200"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-4 border-b border-white/[0.08] pb-2 text-[18px] font-semibold text-neutral-100">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2.5 mt-4 border-b border-white/[0.06] pb-1.5 text-[16px] font-semibold text-neutral-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-3 text-[14px] font-semibold text-neutral-100">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-3 leading-7">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-neutral-100">{children}</strong>,
          em: ({ children }) => <em className="text-neutral-300">{children}</em>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline decoration-indigo-400/30 hover:decoration-indigo-400">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1 marker:text-neutral-600">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1 marker:text-neutral-500">{children}</ol>,
          li: ({ children }) => <li className="leading-7">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 rounded-r-md border-l-2 border-indigo-500/50 bg-indigo-500/[0.06] py-2 pl-4 pr-3 text-[13px] text-neutral-300">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-white/[0.08]" />,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-white/[0.08]">
              <table className="w-full text-[12px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b border-white/[0.08] bg-white/[0.03]">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-white/[0.05]">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-white/[0.02] transition">{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="px-3 py-2 text-neutral-300">{children}</td>,
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            if (match) {
              return (
                <div className="group my-3 overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d0d12]">
                  <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                      {match[1]}
                    </span>
                    <CopyButton text={codeString} />
                  </div>
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      padding: "12px 16px",
                      background: "transparent",
                      fontSize: "12px",
                      lineHeight: "1.6",
                    }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }
            return (
              <code className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[12px] text-indigo-300" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </motion.div>
  );
}

function ActivityStream({
  timeline,
  agents,
  status,
}: {
  timeline: TimelineEntry[];
  agents: Agent[];
  status: Conversation["status"];
}) {
  const [open, setOpen] = useState(true);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border border-white/[0.06] bg-white/[0.015]"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2 text-[12px] text-neutral-300">
          {status === "analyzing" ? (
            <Loader2 size={12} className="animate-spin text-neutral-400" />
          ) : (
            <Check size={12} className="text-emerald-400" />
          )}
          <span>
            {status === "analyzing" ? "Working" : "Worked"} ·{" "}
            <span className="text-neutral-500">{timeline.length} steps</span>
          </span>
        </div>
        <ChevronDown
          size={13}
          className={`text-neutral-500 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-1 border-t border-white/[0.05] px-4 py-3">
              {timeline.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2.5 text-[12px] text-neutral-400"
                >
                  {t.status === "running" ? (
                    <Loader2 size={10} className="animate-spin text-neutral-500" />
                  ) : (
                    <Check size={10} className="text-neutral-600" />
                  )}
                  <span className={t.status === "running" ? "text-neutral-200" : ""}>{t.label}</span>
                </motion.div>
              ))}
            </div>
            <div className="border-t border-white/[0.05] px-4 py-3">
              <div className="mb-2 text-[10px] uppercase tracking-wider text-neutral-600">Agents</div>
              <div className="space-y-1.5">
                {agents.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2 text-neutral-300">
                      {a.status === "done" ? (
                        <Check size={11} className="text-emerald-400" />
                      ) : a.status === "running" ? (
                        <Loader2 size={11} className="animate-spin text-amber-400" />
                      ) : (
                        <CircleDot size={11} className="text-neutral-700" />
                      )}
                      <span className={a.status === "pending" ? "text-neutral-600" : ""}>{a.name}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {a.status === "done" && a.summary
                        ? a.summary
                        : a.status === "running"
                          ? "running…"
                          : a.status === "pending"
                            ? "queued"
                            : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Badge({ label, variant }: { label: string; variant: "capability" | "observed" | "validated" | "not-validated" | "not-tested" | "high" | "medium" | "low" | "library" }) {
  const colors: Record<string, string> = {
    capability: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    observed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    validated: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    "not-validated": "border-neutral-500/30 bg-neutral-500/10 text-neutral-400",
    "not-tested": "border-neutral-600/30 bg-neutral-600/10 text-neutral-500",
    high: "border-red-500/30 bg-red-500/10 text-red-400",
    medium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    low: "border-neutral-500/30 bg-neutral-500/10 text-neutral-400",
    library: "border-neutral-600/30 bg-neutral-600/10 text-neutral-500",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${colors[variant] ?? colors["not-tested"]}`}>
      {label}
    </span>
  );
}

function ConfidenceBadge({ level }: { level: string }) {
  const v = level?.toUpperCase() === "HIGH" ? "high" : level?.toUpperCase() === "MEDIUM" ? "medium" : "low";
  return <Badge label={level} variant={v as "high" | "medium" | "low"} />;
}

function ReportView({ report }: { report: NonNullable<Report> }) {
  const verdictColor =
    report.verdict === "malicious"
      ? "text-red-400"
      : report.verdict === "high-risk"
        ? "text-orange-400"
        : report.verdict === "suspicious"
          ? "text-amber-400"
          : "text-emerald-400";

  const appApis = report.apiCalls?.filter((a) => !a.is_library) ?? [];
  const libApis = report.apiCalls?.filter((a) => a.is_library) ?? [];
  const staticAgents = ["perm", "code", "network", "threat"];
  const behaviorAgent = report.agentFindings?.behavior;
  const correlations = report.correlations ?? [];
  const validated = correlations.filter((c) => c.status === "VALIDATED");
  const notValidated = correlations.filter((c) => c.status === "NOT_VALIDATED");
  const notTested = correlations.filter((c) => c.status === "NOT_TESTED");

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 border-t border-white/[0.06] pt-8 text-[13px] leading-7 text-neutral-300"
    >
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">Report</span>
          <Badge
            label={
              report.analysisScope === "autonomous_dynamic"
                ? "Autonomous Deep Dive"
                : report.analysisScope === "static_and_dynamic"
                ? "Static + Dynamic"
                : "Static Only"
            }
            variant={
              report.analysisScope === "autonomous_dynamic"
                ? "observed"
                : report.analysisScope === "static_and_dynamic"
                ? "observed"
                : "capability"
            }
          />
        </div>
        <h2 className="text-[17px] font-medium text-neutral-100">{report.fileName}</h2>
      </header>

      {/* Executive Summary */}
      <Section title="Executive Summary">
        {report.executiveSummary ? (
          <span>{report.executiveSummary}</span>
        ) : (
          <>
            ARGUS performed {report.analysisScope === "static_and_dynamic" ? "static and dynamic" : report.analysisScope === "autonomous_dynamic" ? "autonomous dynamic" : "static"} analysis of{" "}
            <span className="text-neutral-100">{report.fileName}</span>. Risk score:{" "}
            <span className="text-neutral-100">{report.permissionScore}%</span> with{" "}
            <span className="text-neutral-100">{report.highRisk.length}</span> high-risk capabilities.
          </>
        )}
      </Section>

      {/* Verdict Stats */}
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.04]">
        <Stat label="Risk Score" value={`${report.permissionScore}%`} />
        <Stat label="Confidence" value={`${report.confidence}%`} />
        <Stat label="Verdict" value={report.verdict} valueClass={verdictColor} />
      </div>
      {report.confidenceBreakdown && (
        <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-mono text-[11px] text-neutral-500">
          {report.confidenceBreakdown}
        </div>
      )}

      {/* ==================== STATIC ANALYSIS ==================== */}
      <div className="rounded-lg border border-blue-500/10 bg-blue-500/[0.02] p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">Static Analysis</span>
          <Badge label="Capabilities" variant="capability" />
        </div>

        <Section title="High-Risk Permissions">
          {report.highRisk.length === 0 ? (
            <span className="text-neutral-500">No high-risk permissions declared.</span>
          ) : (
            <ul className="space-y-1">
              {report.highRisk.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <ChevronRight size={12} className="text-neutral-600" />
                  <span className="font-mono text-[12px] text-neutral-200">{p}</span>
                  <Badge label="capability" variant="capability" />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={`API Capabilities — Application Code (${appApis.length})`}>
          {!report.pipelineStatus?.jadx?.success ? (
            <span className="text-amber-500">JADX skipped: {report.pipelineStatus?.jadx?.message}</span>
          ) : appApis.length === 0 ? (
            <span className="text-neutral-500">No suspicious APIs in application code.</span>
          ) : (
            <ul className="space-y-2">
              {appApis.map((api, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ChevronRight size={12} className="mt-1.5 text-neutral-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-neutral-200">{api.api}</span>
                      <Badge label="capability" variant="capability" />
                    </div>
                    <div className="text-[11px] text-neutral-500">{api.description} — {api.file}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {libApis.length > 0 && (
          <Section title={`Library Findings (${libApis.length}) — Low Priority`}>
            <ul className="space-y-1">
              {libApis.slice(0, 5).map((api, i) => (
                <li key={i} className="flex items-center gap-2 text-neutral-500">
                  <ChevronRight size={12} className="text-neutral-700" />
                  <span className="font-mono text-[11px]">{api.api}</span>
                  <Badge label="library" variant="library" />
                </li>
              ))}
              {libApis.length > 5 && <li className="text-[11px] text-neutral-600 pl-5">+{libApis.length - 5} more library findings omitted</li>}
            </ul>
          </Section>
        )}

        {/* Static agent findings */}
        {staticAgents.map((agentId) => {
          const agent = report.agentFindings?.[agentId];
          if (!agent?.findings?.length) return null;
          const agentName = agentId === "perm" ? "Permission" : agentId === "code" ? "Code" : agentId === "network" ? "Network" : "Threat Intel";
          return (
            <Section key={agentId} title={`${agentName} Agent Findings`}>
              <ul className="space-y-2.5">
                {agent.findings!.map((f, i) => (
                  <li key={i} className="rounded-md border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[12px] text-neutral-200">{f.evidence}</span>
                      <ConfidenceBadge level={f.confidence} />
                      <Badge label={f.runtime_validation === "OBSERVED" ? "observed" : "not tested"} variant={f.runtime_validation === "OBSERVED" ? "observed" : "not-tested"} />
                    </div>
                    <div className="text-[11px] text-neutral-400">{f.interpretation}</div>
                    {f.source_file && <div className="mt-0.5 text-[10px] text-neutral-600">Source: {f.source_file}</div>}
                  </li>
                ))}
              </ul>
            </Section>
          );
        })}
      </div>

      {/* ==================== RUNTIME ANALYSIS ==================== */}
      <div className={`rounded-lg border p-4 ${report.analysisScope !== "static_only" ? "border-emerald-500/10 bg-emerald-500/[0.02]" : "border-neutral-700/30 bg-neutral-800/20"}`}>
        <div className="mb-4 flex items-center gap-2">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${report.analysisScope !== "static_only" ? "text-emerald-400" : "text-neutral-500"}`}>
            Runtime Analysis
          </span>
          {report.analysisScope !== "static_only"
            ? <Badge label={report.analysisScope === "autonomous_dynamic" ? "Autonomous Exploration" : "Observations"} variant="observed" />
            : <Badge label="Not Performed" variant="not-tested" />
          }
        </div>

        {report.analysisScope === "static_only" ? (
          <div className="text-[12px] text-neutral-500">
            Dynamic analysis was not performed. No emulator was available.
            Runtime validation is required to confirm static capabilities.
          </div>
        ) : behaviorAgent ? (
          <>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-white/[0.06] bg-[#0a0a0c] px-2 py-1.5">
                <div className="text-[10px] text-neutral-500">Window</div>
                <div className="text-[13px] font-medium text-neutral-200">{behaviorAgent.observation_window_seconds ?? "?"}s</div>
              </div>
              <div className="rounded-md border border-white/[0.06] bg-[#0a0a0c] px-2 py-1.5">
                <div className="text-[10px] text-neutral-500">Hooks Triggered</div>
                <div className="text-[13px] font-medium text-emerald-400">{behaviorAgent.hooks_triggered ?? 0}</div>
              </div>
              <div className="rounded-md border border-white/[0.06] bg-[#0a0a0c] px-2 py-1.5">
                <div className="text-[10px] text-neutral-500">Hooks Silent</div>
                <div className="text-[13px] font-medium text-neutral-400">{behaviorAgent.hooks_silent ?? 0}</div>
              </div>
            </div>

            {behaviorAgent.observed_events && behaviorAgent.observed_events.length > 0 ? (
              <ul className="space-y-2">
                {behaviorAgent.observed_events.map((evt, i) => (
                  <li key={i} className="rounded-md border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Badge label="observed" variant="observed" />
                      <span className="font-mono text-[11px] text-neutral-400">{evt.event_type}</span>
                      {evt.timestamp && <span className="text-[10px] text-neutral-600">{evt.timestamp}</span>}
                    </div>
                    <div className="font-mono text-[12px] text-neutral-200">{evt.evidence}</div>
                    <div className="text-[11px] text-neutral-400">{evt.interpretation}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[12px] text-neutral-500">
                {behaviorAgent.summary || "No monitored behaviors triggered during the observation window."}
              </div>
            )}

            {behaviorAgent.findings && behaviorAgent.findings.length > 0 && (
              <Section title="Behavior Agent Findings">
                <ul className="space-y-2">
                  {behaviorAgent.findings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight size={12} className="mt-1.5 text-emerald-600" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] text-neutral-200">{f.evidence}</span>
                          <Badge label="observed" variant="observed" />
                          <ConfidenceBadge level={f.confidence} />
                        </div>
                        <div className="text-[11px] text-neutral-400">{f.interpretation}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        ) : (
          <div className="text-[12px] text-neutral-500">Behavior agent returned no findings.</div>
        )}
      </div>

      {/* ==================== AUTONOMOUS EXPLORATION PANEL ==================== */}
      {report.analysisScope === "autonomous_dynamic" && report.exploration && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              🤖 Autonomous Exploration
            </span>
            <Badge label="LLM-Driven" variant="observed" />
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-white/[0.06] bg-[#0a0a0c] px-3 py-2">
              <div className="text-[10px] text-neutral-500">Steps Executed</div>
              <div className="text-[16px] font-semibold text-neutral-100">{report.exploration.total_steps}</div>
            </div>
            <div className="rounded-md border border-white/[0.06] bg-[#0a0a0c] px-3 py-2">
              <div className="text-[10px] text-neutral-500">Screens Explored</div>
              <div className="text-[16px] font-semibold text-emerald-400">{report.exploration.screens_explored}</div>
            </div>
            <div className="rounded-md border border-white/[0.06] bg-[#0a0a0c] px-3 py-2">
              <div className="text-[10px] text-neutral-500">Elements Touched</div>
              <div className="text-[16px] font-semibold text-emerald-300">{report.exploration.elements_touched}</div>
            </div>
          </div>

          {report.exploration.frida_events_total != null && (
            <div className="mb-3 flex items-center gap-2 text-[12px]">
              <span className="text-neutral-500">Frida events captured during exploration:</span>
              <span className="font-semibold text-neutral-100">{report.exploration.frida_events_total}</span>
            </div>
          )}

          <div className="mb-3 flex items-center gap-2 text-[11px]">
            <span className="text-neutral-500">Stop reason:</span>
            <span className="font-mono text-emerald-300">{report.exploration.stop_reason}</span>
          </div>

          {report.exploration.activities_visited.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-neutral-500">
                Activities Visited ({report.exploration.activities_visited.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {report.exploration.activities_visited.map((act, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300"
                  >
                    {act}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== CORRELATION ANALYSIS ==================== */}
      {correlations.length > 0 && (
        <div className="rounded-lg border border-violet-500/10 bg-violet-500/[0.02] p-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-400">Correlation Analysis</span>
            <span className="text-[11px] text-neutral-500">
              {validated.length} validated · {notValidated.length} not validated · {notTested.length} not tested
            </span>
          </div>

          <div className="space-y-2">
            {correlations.map((c, i) => {
              const statusVariant = c.status === "VALIDATED" ? "validated" : c.status === "NOT_VALIDATED" ? "not-validated" : "not-tested";
              const borderColor = c.status === "VALIDATED" ? "border-emerald-500/20" : c.status === "NOT_VALIDATED" ? "border-neutral-600/20" : "border-neutral-700/20";
              return (
                <div key={i} className={`rounded-md border ${borderColor} bg-white/[0.02] px-3 py-2`}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-[12px] font-medium text-neutral-200">{c.capability}</span>
                    <Badge label={c.status.replace("_", " ")} variant={statusVariant} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-blue-400/60">Static</div>
                      <div className="text-neutral-400">{c.static_evidence}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-emerald-400/60">Runtime</div>
                      <div className="text-neutral-400">{c.dynamic_evidence}</div>
                    </div>
                  </div>
                  <div className="mt-1 text-[10px] text-neutral-500">{c.risk_assessment}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== PIPELINE & MITRE ==================== */}
      <Section title="Pipeline Status">
        <ul className="space-y-1 font-mono text-[12px]">
          <li>
            <span className={report.pipelineStatus?.apktool?.success ? "text-emerald-400" : "text-amber-500"}>
              [APKtool]
            </span>{" "}
            {report.pipelineStatus?.apktool?.message}
          </li>
          <li>
            <span className={report.pipelineStatus?.jadx?.success ? "text-emerald-400" : "text-amber-500"}>
              [JADX]
            </span>{" "}
            {report.pipelineStatus?.jadx?.message}
          </li>
          <li>
            <span className={report.pipelineStatus?.sandbox?.success ? "text-emerald-400" : "text-amber-500"}>
              [Sandbox]
            </span>{" "}
            {report.pipelineStatus?.sandbox?.message}
          </li>
        </ul>
      </Section>

      {report.mitreTechniques && report.mitreTechniques.length > 0 && (
        <Section title="MITRE ATT&CK Techniques">
          <ul className="space-y-1">
            {report.mitreTechniques.map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <ChevronRight size={12} className="mt-1.5 text-neutral-600" />
                <span className="font-mono text-[12px] text-neutral-200">{t}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Recommended Actions">
        {report.recommendedActions
          ? report.recommendedActions
          : report.verdict === "malicious"
            ? "Quarantine the sample, revoke any associated certificates, and pivot on observed network indicators."
            : report.verdict === "high-risk"
              ? "Conduct dynamic analysis in a sandboxed environment to validate static findings. Do not deploy until runtime behavior is confirmed safe."
              : report.verdict === "suspicious"
                ? "Hold the sample for manual review. Inspect the flagged permissions and APIs before promotion."
                : "Sample is safe to release based on static analysis. Retain telemetry for baseline comparison."}
      </Section>

      {report.analystSummary && (
        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/[0.03] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Hexagon size={14} className="text-indigo-400" />
            <span className="text-[12px] font-semibold uppercase tracking-wider text-indigo-400">
              Analyst Takeaways
            </span>
          </div>
          <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-300">
            {report.analystSummary}
          </div>
        </div>
      )}

      {/* ==================== OSINT TRIAGE ==================== */}
      {report.osint && (
        <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">OSINT Triage</span>
            <span className="text-[11px] text-neutral-500">VirusTotal · MalwareBazaar</span>
          </div>
          <div className="space-y-3">
            {/* VirusTotal */}
            {report.osint.virustotal && (
              <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-neutral-300">VirusTotal</span>
                  {report.osint.virustotal.skipped ? (
                    <Badge label="No API Key" variant="not-tested" />
                  ) : report.osint.virustotal.found === false ? (
                    <Badge label="Unknown Hash" variant="not-tested" />
                  ) : report.osint.virustotal.known_malicious ? (
                    <Badge label="Known Malicious" variant="high" />
                  ) : (
                    <Badge label="Clean" variant="observed" />
                  )}
                </div>
                {report.osint.virustotal.found && !report.osint.virustotal.skipped && (
                  <>
                    <div className="mb-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (report.osint.virustotal.detection_ratio ?? 0) > 0.5
                              ? "bg-red-500"
                              : (report.osint.virustotal.detection_ratio ?? 0) > 0.1
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${((report.osint.virustotal.detection_ratio ?? 0) * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-neutral-400">
                        {report.osint.virustotal.detection_count}/{report.osint.virustotal.engine_count} engines
                      </span>
                    </div>
                    {report.osint.virustotal.family_tags && report.osint.virustotal.family_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {report.osint.virustotal.family_tags.map((tag) => (
                          <span key={tag} className="rounded border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {/* MalwareBazaar */}
            {report.osint.malwarebazaar && (
              <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-neutral-300">MalwareBazaar</span>
                  {report.osint.malwarebazaar.found ? (
                    <Badge label="Known Malware" variant="high" />
                  ) : (
                    <Badge label="Not Found" variant="not-tested" />
                  )}
                </div>
                {report.osint.malwarebazaar.found && (
                  <div className="mt-1 space-y-1 text-[12px]">
                    {report.osint.malwarebazaar.malware_family && (
                      <div><span className="text-neutral-500">Family: </span><span className="font-mono text-neutral-200">{report.osint.malwarebazaar.malware_family}</span></div>
                    )}
                    {report.osint.malwarebazaar.bazaar_tags && report.osint.malwarebazaar.bazaar_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {report.osint.malwarebazaar.bazaar_tags.map((tag) => (
                          <span key={tag} className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">{tag}</span>
                        ))}
                      </div>
                    )}
                    {report.osint.malwarebazaar.first_seen && (
                      <div><span className="text-neutral-500">First seen: </span><span className="text-neutral-400">{report.osint.malwarebazaar.first_seen}</span></div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== YARA RULE ==================== */}
      {report.yaraRule && (
        <Section title={`YARA Rule — ${report.yaraRuleName ?? "auto-generated"}`}>
          <div className="relative">
            <pre className="overflow-x-auto rounded-md border border-amber-500/10 bg-amber-500/[0.02] p-3 font-mono text-[11px] leading-5 text-amber-300/90">
              {report.yaraRule}
            </pre>
            <button
              onClick={() => { if (report.yaraRule) navigator.clipboard.writeText(report.yaraRule); }}
              className="absolute right-2 top-2 rounded px-2 py-0.5 text-[10px] text-neutral-500 hover:bg-white/[0.06] hover:text-neutral-300"
            >
              copy
            </button>
          </div>
        </Section>
      )}
    </motion.article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-500 hover:text-neutral-300"
      >
        <ChevronDown size={11} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
        {title}
      </button>
      {open && <div className="pl-[18px]">{children}</div>}
    </section>
  );
}

function Stat({ label, value, valueClass = "text-neutral-100" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-[#0a0a0c] px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`mt-1 text-[15px] font-medium capitalize ${valueClass}`}>{value}</div>
    </div>
  );
}
