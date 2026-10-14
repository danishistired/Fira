import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { Upload, FileUp, Sparkles, MessageSquareText, Send, LoaderCircle, Shield, BrainCircuit, Orbit } from "lucide-react";

export const Route = createFileRoute("/_argus/")({
  head: () => ({ meta: [{ title: "ARGUS" }] }),
  component: Home,
});

type Activity = {
  title: string;
  detail: string;
  status: "idle" | "running" | "done" | "error";
};

export function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");
  const [analysisState, setAnalysisState] = useState<Activity>({
    title: "Ready",
    detail: "Upload an APK to start background analysis.",
    status: "idle",
  });
  const [chatLog, setChatLog] = useState<Array<{ role: "assistant" | "user"; text: string }>>([
    {
      role: "assistant",
      text: "Drop an APK or paste a note. I’ll analyze it in the background and keep the conversation ready for later.",
    },
  ]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [chatLocked, setChatLocked] = useState(false);

  const ambientOrbs = useMemo(
    () => [
      { className: "left-[6%] top-[10%] h-72 w-72", color: "rgba(99,102,241,0.28)", delay: 0 },
      { className: "right-[8%] top-[16%] h-96 w-96", color: "rgba(34,211,238,0.18)", delay: 0.6 },
      { className: "left-[32%] bottom-[8%] h-80 w-80", color: "rgba(16,185,129,0.12)", delay: 1.2 },
    ],
    [],
  );

  const startUpload = async (file: File) => {
    const id = Date.now();
    setChatLocked(true);
    setUploadProgress(8);
    setAnalysisState({
      title: `Analyzing ${file.name}`,
      detail: "Sending the sample to the analysis service.",
      status: "running",
    });
    setChatLog((log) => [
      ...log,
      { role: "user", text: `Upload: ${file.name}` },
      { role: "assistant", text: "Analysis started. I’ll keep running in the background and update you here." },
    ]);

    const tick = window.setInterval(() => {
      setUploadProgress((value) => Math.min(value + 12, 94));
    }, 500);

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("http://localhost:5000/analyze", { method: "POST", body: form });
      const result = await response.json();
      window.clearInterval(tick);
      setUploadProgress(100);
      if (!response.ok) {
        throw new Error(result?.error ?? "Analysis failed");
      }
      setAnalysisState({
        title: `Done: ${file.name}`,
        detail: `Permission score ${result.permission_score_percent}% · background analysis complete.`,
        status: "done",
      });
      setChatLog((log) => [
        ...log,
        {
          role: "assistant",
          text: `Finished. I found ${result.high_risk_permissions?.length ?? 0} high-risk permissions. Ask me anything about the sample when you’re ready.`,
        },
      ]);
    } catch (error) {
      window.clearInterval(tick);
      setUploadProgress(0);
      setAnalysisState({
        title: "Upload failed",
        detail: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      });
      setChatLog((log) => [
        ...log,
        {
          role: "assistant",
          text: "I couldn’t complete that upload. The sample may not be a valid APK or the analysis service may be unavailable.",
        },
      ]);
    } finally {
      setChatLocked(false);
    }
  };

  const submitChat = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setChatLog((log) => [...log, { role: "user", text: trimmed }]);
    setMessage("");
    setChatLog((log) => [
      ...log,
      {
        role: "assistant",
        text:
          analysisState.status === "done"
            ? "I can discuss the sample now. Tell me what you want to inspect: permissions, manifest, behavior, or risk summary."
            : "I’m still processing the sample in the background. I’ll be ready to talk once the run finishes.",
      },
    ]);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        {ambientOrbs.map((orb, index) => (
          <motion.div
            key={index}
            className={`absolute rounded-full blur-3xl ${orb.className}`}
            style={{ background: orb.color }}
            animate={{ y: [0, -18, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 10 + index * 2, repeat: Infinity, ease: "easeInOut", delay: orb.delay }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_34%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.14),transparent_30%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10 lg:px-10">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
              className="glass relative overflow-hidden rounded-4xl border border-white/10 p-8 shadow-2xl shadow-black/30"
          >
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-accent/80 to-transparent" />
            <div className="mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-muted-foreground">
              <Orbit size={14} className="text-cyan-accent" />
              Antigravity Analysis Console
            </div>

            <div className="max-w-2xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
                Upload an APK. Talk to the agent later.
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                No dashboards, no fake graphs, no noise. Drop a sample and let ARGUS run in the background while you stay in the loop.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Shield, title: "Background analysis", text: "The sample keeps moving while you keep working." },
                { icon: BrainCircuit, title: "Ask later", text: "Open the chat when you want the findings explained." },
                { icon: Sparkles, title: "Minimal surface", text: "Only the upload lane and conversation panel stay visible." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <Icon size={18} className="text-cyan-accent" />
                    <div className="mt-3 text-sm font-medium">{item.title}</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Upload</div>
                  <div className="mt-1 text-sm text-foreground">APK intake and background processing</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:scale-[1.01] hover:bg-primary/90"
                  >
                    <Upload size={16} />
                    Choose APK
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".apk"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void startUpload(file);
                      }
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>

              <label
                className="mt-4 flex cursor-pointer items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center transition hover:border-cyan-accent/40 hover:bg-white/8"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (file) {
                    void startUpload(file);
                  }
                }}
              >
                <div>
                  <FileUp size={28} className="mx-auto text-cyan-accent" />
                  <div className="mt-3 text-sm font-medium">Drop an APK here</div>
                  <div className="mt-1 text-xs text-muted-foreground">Analysis begins immediately and continues in the background.</div>
                </div>
              </label>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{analysisState.title}</span>
                  <span>{uploadProgress > 0 ? `${uploadProgress}%` : "idle"}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    className="h-full rounded-full bg-linear-to-r from-primary via-cyan-accent to-safe"
                  />
                </div>
                <div className="text-xs text-muted-foreground">{analysisState.detail}</div>
              </div>
            </div>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
              className="glass flex min-h-136 flex-col rounded-4xl border border-white/10 p-5 shadow-2xl shadow-black/30"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Chat</div>
                <div className="mt-1 text-sm text-foreground">Ask ARGUS after the run finishes.</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {chatLocked ? <LoaderCircle size={14} className="animate-spin text-cyan-accent" /> : <MessageSquareText size={14} className="text-cyan-accent" />}
                Background ready
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-auto rounded-[1.25rem] border border-white/8 bg-black/20 p-4">
              {chatLog.map((entry, index) => (
                <div key={index} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      entry.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-white/10 bg-white/5 text-foreground"
                    }`}
                  >
                    {entry.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitChat();
                  }
                }}
                placeholder={analysisState.status === "done" ? "Ask about the sample..." : "Wait for analysis or leave a note..."}
                className="flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-cyan-accent/60"
              />
              <button
                onClick={submitChat}
                className="inline-flex items-center gap-2 rounded-full bg-cyan-accent px-4 py-3 text-sm font-medium text-black transition hover:opacity-90"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
