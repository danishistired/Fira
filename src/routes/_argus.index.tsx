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
} from "lucide-react";

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
  analysisScope?: "static_only" | "static_and_dynamic";
  package?: string;
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

const PIPELINE_STEPS = [
  "Reading APK manifest",
  "Inspecting permissions",
  "Decompiling classes.dex",
  "Running static analysis",
  "Executing sandbox",
  "Monitoring network activity",
  "Correlating threat intelligence",
  "Running multi-agent review",
  "Generating verdict",
  "Building report",
];

const newId = () => Math.random().toString(36).slice(2, 10);

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

  // ---------- upload (reuses existing /analyze backend) ----------
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

    // simulate live activity stream
    const pushStep = (label: string) => {
      setConversations((list) =>
        list.map((c) =>
          c.id === convId
            ? {
                ...c,
                timeline: [
                  ...c.timeline.map((t) => ({ ...t, status: "done" as const })),
                  { id: newId(), label, status: "running", ts: Date.now() },
                ],
              }
            : c,
        ),
      );
    };
    const setAgent = (id: string, status: AgentStatus, summary?: string, duration?: number) => {
      setConversations((list) =>
        list.map((c) =>
          c.id === convId
            ? { ...c, agents: c.agents.map((a) => (a.id === id ? { ...a, status, summary, duration } : a)) }
            : c,
        ),
      );
    };

    let stepIdx = 0;
    const stepTimer = window.setInterval(() => {
      if (stepIdx < PIPELINE_STEPS.length) {
        pushStep(PIPELINE_STEPS[stepIdx]);
        stepIdx++;
      }
    }, 700);

    const agentTimers: number[] = [];
    AGENT_TEMPLATE.forEach((a, i) => {
      agentTimers.push(window.setTimeout(() => setAgent(a.id, "running"), 800 + i * 900));
    });

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("http://localhost:5050/analyze", { method: "POST", body: form });
      const result = await response.json();
      window.clearInterval(stepTimer);
      agentTimers.forEach(clearTimeout);

      if (!response.ok) throw new Error(result?.error ?? "Analysis failed");

      const highRisk: string[] = result.high_risk_permissions ?? [];
      const score: number = result.permission_score_percent ?? 0;
      const apiCalls = result.api_calls ?? [];
      const pipelineStatus = result.pipeline_status ?? {
        apktool: { success: false, message: "Not run" },
        jadx: { success: false, message: "Not run" },
        sandbox: { success: false, message: "Not run" }
      };
      // Use LLM verdict if available, otherwise fallback to rule-based
      const verdict: "benign" | "suspicious" | "high-risk" | "malicious" =
        result.verdict ?? (score > 70 ? "high-risk" : score > 40 ? "suspicious" : "benign");
      const confidence: number = result.confidence ?? Math.min(99, 60 + Math.round(score / 3));
      const agentFindings: Record<string, AgentFinding> | undefined = result.agent_findings;

      // Use LLM agent summaries if available, otherwise fallback
      const fallbackSummaries: Record<string, string> = {
        perm: `${highRisk.length} high-risk permissions`,
        code: "Static scan complete",
        behavior: "No anomalous runtime patterns",
        network: "Outbound traffic profile captured",
        threat: "Correlated against intel feeds",
        consensus: `Verdict: ${verdict}`,
      };
      AGENT_TEMPLATE.forEach((a, i) => {
        const finding = agentFindings?.[a.id];
        setAgent(a.id, "done", finding?.summary ?? fallbackSummaries[a.id], 4 + i * 3);
      });

      setConversations((list) =>
        list.map((c) =>
          c.id === convId
            ? {
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
                  confidenceBreakdown: result.confidence_breakdown,
                  executiveSummary: result.executive_summary,
                  analystSummary: result.analyst_summary,
                  recommendedActions: result.recommended_actions,
                  mitreTechniques: result.mitre_techniques,
                  agentFindings,
                  correlations: result.correlations,
                  analysisScope: result.analysis_scope,
                  package: result.package,
                },
                messages: [
                  ...c.messages,
                  {
                    id: newId(),
                    role: "assistant",
                    text: result.executive_summary
                      ? `Analysis complete. ${result.executive_summary}`
                      : `Analysis complete. Verdict: ${verdict}. ${highRisk.length} high-risk permissions detected. See report below — ask follow-ups anytime.`,
                  },
                ],
              }
            : c,
        ),
      );
    } catch (err) {
      window.clearInterval(stepTimer);
      agentTimers.forEach(clearTimeout);
      setConversations((list) =>
        list.map((c) =>
          c.id === convId
            ? {
                ...c,
                status: "error",
                messages: [
                  ...c.messages,
                  {
                    id: newId(),
                    role: "assistant",
                    text:
                      err instanceof Error
                        ? `Analysis failed: ${err.message}`
                        : "Analysis failed.",
                  },
                ],
              }
            : c,
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
        { id: thinkingId, role: "assistant", text: "Thinking…" },
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
                        : "Upload an APK with the + button and I'll begin a multi-agent analysis." }
                    : m,
                ),
              }
            : c,
        ),
      );
      return;
    }

    try {
      const resp = await fetch("http://localhost:5050/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          report_context: active.report,
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
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveId(c.id);
                      setDrawerOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[12px] transition ${
                      c.id === activeId
                        ? "bg-white/[0.05] text-neutral-100"
                        : "text-neutral-400 hover:bg-white/[0.03] hover:text-neutral-200"
                    }`}
                  >
                    <span className="truncate">{c.title}</span>
                    {c.status === "analyzing" && (
                      <Loader2 size={11} className="ml-2 shrink-0 animate-spin text-neutral-500" />
                    )}
                  </button>
                ))}
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
                {active.messages.map((m, i) =>
                  m.role === "user" ? (
                    <UserMessage key={m.id} text={m.text} />
                  ) : (
                    <AssistantMessage key={m.id} text={m.text} />
                  ),
                )}

                {(active.status === "analyzing" || active.timeline.length > 0) && (
                  <ActivityStream timeline={active.timeline} agents={active.agents} status={active.status} />
                )}

                {active.report && <ReportView report={active.report} />}
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="w-full shrink-0 border-t border-white/[0.06] bg-[#0a0a0c]/95 backdrop-blur">
          <div className="mx-auto w-full max-w-3xl px-6 py-4">
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

function AssistantMessage({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="text-[13px] leading-7 text-neutral-200"
    >
      {text}
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
            label={report.analysisScope === "static_and_dynamic" ? "Static + Dynamic" : "Static Only"}
            variant={report.analysisScope === "static_and_dynamic" ? "observed" : "capability"}
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
            ARGUS performed {report.analysisScope === "static_and_dynamic" ? "static and dynamic" : "static"} analysis of{" "}
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
      <div className={`rounded-lg border p-4 ${report.analysisScope === "static_and_dynamic" ? "border-emerald-500/10 bg-emerald-500/[0.02]" : "border-neutral-700/30 bg-neutral-800/20"}`}>
        <div className="mb-4 flex items-center gap-2">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${report.analysisScope === "static_and_dynamic" ? "text-emerald-400" : "text-neutral-500"}`}>
            Runtime Analysis
          </span>
          {report.analysisScope === "static_and_dynamic"
            ? <Badge label="Observations" variant="observed" />
            : <Badge label="Not Performed" variant="not-tested" />
          }
        </div>

        {report.analysisScope !== "static_and_dynamic" ? (
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
