import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { activityLog, agents } from "@/components/argus/mockData";

export const Route = createFileRoute("/_argus/agents")({
  head: () => ({ meta: [{ title: "Agents · ARGUS" }] }),
  component: AgentsPage,
});

function AgentNetwork() {
  const W = 520, H = 420;
  const cx = W / 2, cy = H / 2 - 30;
  const radius = 140;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <defs>
        <radialGradient id="orch-g">
          <stop offset="0%" stopColor="#6366F1" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
        </radialGradient>
      </defs>
      {agents.map((a, i) => {
        const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
        const ax = cx + Math.cos(angle) * radius;
        const ay = cy + Math.sin(angle) * radius;
        const active = a.status === "active";
        return (
          <g key={a.id}>
            <line x1={cx} y1={cy} x2={ax} y2={ay} stroke={active ? a.color : "rgba(255,255,255,0.08)"} strokeWidth={1} className={active ? "flow-line" : ""} opacity={active ? 0.6 : 0.5} />
            {active && (
              <motion.circle r={2.5} fill={a.color}
                initial={{ cx: cx, cy: cy }}
                animate={{ cx: [cx, ax], cy: [cy, ay] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2, ease: "linear" }}
              />
            )}
            <circle cx={ax} cy={ay} r={28} fill="#12121A" stroke={active ? a.color : "rgba(255,255,255,0.1)"} strokeWidth={1.5} className={active ? "breathe" : ""} />
            <text x={ax} y={ay + 5} textAnchor="middle" fontSize={16}>{a.icon}</text>
            <text x={ax} y={ay + 48} textAnchor="middle" fontSize={9} fill="#64748B">{a.name.split(" ")[0]}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={70} fill="url(#orch-g)" />
      <circle cx={cx} cy={cy} r={42} fill="#12121A" stroke="#6366F1" strokeWidth={2} className="breathe" />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={11} fill="#F1F5F9" fontWeight={600}>ORCHESTRATOR</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="#64748B">routing 4 tasks</text>

      <circle cx={cx} cy={H - 30} r={28} fill="#12121A" stroke="#10B981" strokeWidth={1.5} />
      <text x={cx} y={H - 26} textAnchor="middle" fontSize={9} fill="#10B981" fontWeight={600}>CONSENSUS</text>
      <line x1={cx} y1={cy + 42} x2={cx} y2={H - 58} stroke="#10B981" strokeWidth={1} className="flow-line" opacity={0.6} />
    </svg>
  );
}

function AgentsPage() {
  const [paused, setPaused] = useState(false);
  const [feed, setFeed] = useState(activityLog);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setFeed((prev) => {
        const next = activityLog[Math.floor(Math.random() * activityLog.length)];
        const now = new Date();
        const t = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
        return [...prev.slice(-30), { ...next, t }];
      });
      ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
    }, 2400);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Agent Network</h1>
        <p className="text-xs text-muted-foreground mt-1">Multi-agent orchestration · live telemetry</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="glass rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Orchestrator Topology</h3>
            <span className="text-xs text-muted-foreground">6 agents · 1 consensus</span>
          </div>
          <div className="h-[420px]"><AgentNetwork /></div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Agent Performance · Today</h3>
          <div className="space-y-3">
            {agents.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-surface/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{a.icon}</span>
                    <span className="text-xs font-medium">{a.name}</span>
                  </div>
                  <span className="h-1.5 w-1.5 rounded-full pulse-dot" style={{ background: a.status === "active" ? a.color : "#334155" }} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                  <div><div className="text-foreground font-mono">{Math.floor(Math.random()*200)+50}</div>tasks</div>
                  <div><div className="text-foreground font-mono">{(Math.random()*3+1).toFixed(1)}s</div>avg</div>
                  <div><div className="text-foreground font-mono">{(Math.random()*5+94).toFixed(1)}%</div>accuracy</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Activity Feed</h3>
            <p className="text-xs text-muted-foreground">Real-time agent log</p>
          </div>
          <button onClick={() => setPaused(!paused)} className="rounded-md border border-border bg-surface px-3 py-1 text-xs hover:bg-surface-hover">
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
        <div ref={ref} className="h-72 overflow-y-auto font-mono text-xs space-y-1 pr-2">
          {feed.map((e, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3 py-1 border-l-2 pl-3"
              style={{ borderColor: e.color }}
            >
              <span className="text-text-muted">[{e.t}]</span>
              <span style={{ color: e.color }} className="font-medium whitespace-nowrap">{e.agent}</span>
              <span className="text-muted-foreground">→ {e.msg}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
