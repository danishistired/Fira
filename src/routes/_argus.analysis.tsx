import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { mitreMatrix, shap } from "@/components/argus/mockData";

export const Route = createFileRoute("/_argus/analysis")({
  head: () => ({ meta: [{ title: "Analysis · ARGUS" }] }),
  component: Analysis,
});

const tabs = ["Overview", "Permissions", "Code Analysis", "Behavior", "Network", "MITRE ATT&CK", "AI Reasoning"];

const consensus = [
  { name: "Permission Agent", icon: "🔒", verdict: "MALICIOUS", conf: 96, finding: "14 dangerous permissions, accessibility abuse" },
  { name: "Code Agent", icon: "💻", verdict: "MALICIOUS", conf: 92, finding: "DexClassLoader + XOR string obfuscation" },
  { name: "Network Agent", icon: "🌐", verdict: "MALICIOUS", conf: 88, finding: "Outbound TLS to known C2: 185.234.72.19" },
  { name: "Behavior Agent", icon: "⚡", verdict: "MALICIOUS", conf: 94, finding: "Registers AccessibilityService + SMS read" },
  { name: "Threat Intel", icon: "🕵️", verdict: "MALICIOUS", conf: 97, finding: "VirusTotal: 48/72 · Family: Cerberus" },
  { name: "Multimodal Agent", icon: "👁️", verdict: "MALICIOUS", conf: 89, finding: "Phishing overlay clone of HDFC banking UI" },
];

function Gauge({ value }: { value: number }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  const pct = value / 10;
  const color = value > 7 ? "#EF4444" : value > 4 ? "#F59E0B" : "#10B981";
  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx={60} cy={60} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={8} fill="none" />
        <motion.circle
          cx={60} cy={60} r={r}
          stroke={color} strokeWidth={8} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-3xl font-semibold tabular-nums" style={{ color }}>{value.toFixed(1)}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk Score</div>
        </div>
      </div>
    </div>
  );
}

function ShapChart() {
  const max = Math.max(...shap.map(s => Math.abs(s.value)));
  return (
    <div className="space-y-2">
      {shap.map((s, i) => {
        const pct = (Math.abs(s.value) / max) * 45;
        const positive = s.value > 0;
        return (
          <div key={s.feature} className="flex items-center gap-3 text-xs">
            <div className="w-48 truncate text-muted-foreground">{s.feature}</div>
            <div className="relative flex-1 h-6">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                className="absolute top-1 bottom-1 rounded"
                style={{
                  left: positive ? "50%" : `${50 - pct}%`,
                  background: positive ? "#EF4444" : "#10B981",
                  opacity: 0.85,
                }}
              />
            </div>
            <div className="w-12 text-right font-mono tabular-nums" style={{ color: positive ? "#EF4444" : "#10B981" }}>
              {positive ? "+" : ""}{s.value.toFixed(1)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Analysis() {
  const [tab, setTab] = useState("Overview");
  return (
    <div className="space-y-5">
      <div className="glass rounded-xl p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-danger/40 to-warning/20 text-2xl">📱</div>
            <div>
              <div className="font-mono text-lg">com.fake.hdfc.app</div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">SHA-256: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6…</div>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span>Size: <span className="text-foreground font-mono">7.2 MB</span></span>
                <span>Submitted: <span className="text-foreground">2m ago</span></span>
                <span>By: <span className="text-foreground">analyst@argus</span></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Gauge value={9.4} />
            <div>
              <div className="inline-block rounded-md bg-danger/15 px-3 py-1 text-sm font-semibold text-danger glow-danger">MALICIOUS</div>
              <div className="mt-3 text-xs text-muted-foreground">Consensus confidence</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 w-32 rounded bg-border overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: "96%" }} transition={{ duration: 1.4 }} className="h-full bg-danger" />
                </div>
                <span className="text-xs font-mono tabular-nums">96%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 py-2.5 text-xs whitespace-nowrap transition ${tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t}
            {tab === t && <motion.span layoutId="tab-underline" className="absolute left-0 right-0 bottom-0 h-[2px] bg-primary" />}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold">SHAP Feature Contributions</h3>
            <p className="text-xs text-muted-foreground mb-4">Drivers of the final risk score</p>
            <ShapChart />
            <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs">
              <div><span className="text-muted-foreground">Base</span> <span className="font-mono">0.0</span></div>
              <div className="text-muted-foreground">→</div>
              <div><span className="text-muted-foreground">Final</span> <span className="font-mono text-danger">9.4</span></div>
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold">Agent Consensus</h3>
            <p className="text-xs text-muted-foreground mb-4">6 agents · 0 disputes</p>
            <div className="grid grid-cols-2 gap-3">
              {consensus.map((c) => (
                <div key={c.name} className="rounded-lg border border-border bg-surface/60 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{c.icon}</span>
                      <span className="text-xs font-medium">{c.name}</span>
                    </div>
                    <span className="text-[9px] font-semibold text-danger">{c.verdict}</span>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">{c.finding}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded bg-border overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${c.conf}%` }} transition={{ duration: 0.9 }} className="h-full bg-primary" />
                    </div>
                    <span className="text-[10px] font-mono tabular-nums">{c.conf}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "MITRE ATT&CK" && (
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-1">MITRE ATT&CK Mobile · Coverage Map</h3>
          <p className="text-xs text-muted-foreground mb-4">Highlighted = detected in sample</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {mitreMatrix.map((col) => (
              <div key={col.tactic}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 pb-2 border-b border-border">{col.tactic}</div>
                <div className="space-y-2">
                  {col.techniques.map((t) => (
                    <div
                      key={t.id}
                      title={`${t.id} · ${t.name}`}
                      className={`rounded-md border p-2 text-xs cursor-help transition ${t.detected ? "border-danger/40 bg-danger/10 glow-danger" : "border-border bg-surface/40 text-muted-foreground"}`}
                    >
                      <div className="font-mono text-[10px]" style={{ color: t.detected ? "#EF4444" : undefined }}>{t.id}</div>
                      <div className="mt-0.5 truncate text-[11px]">{t.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab !== "Overview" && tab !== "MITRE ATT&CK" && (
        <div className="glass rounded-xl p-10 text-center">
          <div className="text-sm text-muted-foreground">{tab} module — telemetry connected, awaiting data sync.</div>
        </div>
      )}
    </div>
  );
}
