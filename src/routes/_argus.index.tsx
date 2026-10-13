import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FileSearch, ShieldAlert, Clock, Target, ArrowUp, ArrowDown, Brain } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatedNumber } from "@/components/argus/AnimatedNumber";
import { agents, families, pipelineStages, riskDist, sparkA, sparkB, sparkC, sparkD, threatTrend, verdicts } from "@/components/argus/mockData";

export const Route = createFileRoute("/_argus/")({
  head: () => ({ meta: [{ title: "Overview · ARGUS" }] }),
  component: Overview,
});

const statusColor: Record<string, string> = { danger: "#EF4444", warning: "#F59E0B", safe: "#10B981" };

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`glass rounded-xl p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, suffix = "", decimals = 0, color, spark, delta, deltaUp }: any) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className={`grid h-9 w-9 place-items-center rounded-full`} style={{ background: `${color}22`, color }}>
          <Icon size={18} />
        </div>
        <div className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium`} style={{ background: deltaUp ? "#10B98122" : "#EF444422", color: deltaUp ? "#10B981" : "#EF4444" }}>
          {deltaUp ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{delta}
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-3xl font-semibold tracking-tight tabular-nums">
            <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        </div>
        <div className="h-10 w-24">
          <ResponsiveContainer>
            <LineChart data={spark}>
              <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

function Pipeline() {
  const N = pipelineStages.length;
  return (
    <Card className="col-span-3">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Live Analysis Pipeline</h2>
          <p className="text-xs text-muted-foreground">7-layer multi-agent malware analysis</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-safe pulse-dot" /> Streaming
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg viewBox="0 0 800 80" className="w-full h-20">
          {Array.from({ length: N - 1 }).map((_, i) => {
            const x1 = 50 + i * (700 / (N - 1));
            const x2 = 50 + (i + 1) * (700 / (N - 1));
            return (
              <g key={i}>
                <line x1={x1 + 20} y1={40} x2={x2 - 20} y2={40} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                <line x1={x1 + 20} y1={40} x2={x2 - 20} y2={40} stroke="#6366F1" strokeWidth={1.5} className="flow-line" opacity={0.7} />
                <motion.circle
                  r={2.5}
                  fill="#6366F1"
                  initial={{ cx: x1 + 20, cy: 40, opacity: 0 }}
                  animate={{ cx: [x1 + 20, x2 - 20], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18, ease: "linear" }}
                />
              </g>
            );
          })}
        </svg>
        <div className="flex justify-between -mt-16 px-[10px]">
          {pipelineStages.map((s, i) => (
            <div key={s.id} className="flex flex-col items-center w-20">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="grid h-10 w-10 place-items-center rounded-lg bg-surface border border-border text-base"
              >
                {s.icon}
              </motion.div>
              <div className="mt-2 text-[10px] text-center text-muted-foreground leading-tight">{s.label}</div>
              <div className="text-[10px] text-primary font-mono">{s.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { pkg: "com.fake.hdfc.app", stage: "AI Agents", color: "#6366F1", badge: null },
          { pkg: "org.trojan.sms.stealer", stage: "Verdict", color: "#EF4444", badge: "CRITICAL" },
          { pkg: "net.adware.popup.v2", stage: "Static Analysis", color: "#F59E0B", badge: "IN PROGRESS" },
        ].map((r) => (
          <div key={r.pkg} className="rounded-lg border border-border bg-surface/60 p-3">
            <div className="font-mono text-xs text-foreground truncate">{r.pkg}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">→ {r.stage}</span>
              {r.badge ? (
                <span className="rounded text-[9px] font-semibold px-1.5 py-0.5" style={{ background: `${r.color}22`, color: r.color }}>{r.badge}</span>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full pulse-dot" style={{ background: r.color }} />
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AgentPanel() {
  return (
    <Card className="col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">AI Agent Activity</h2>
          <p className="text-xs text-muted-foreground">6 specialized agents · orchestrated</p>
        </div>
        <Brain size={16} className="text-primary" />
      </div>
      <div className="space-y-2">
        {agents.map((a) => {
          const active = a.status === "active";
          return (
            <div key={a.id} className={`relative overflow-hidden rounded-lg border border-border bg-surface/60 p-3 ${active ? "shimmer" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="text-lg">{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{a.name}</span>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: active ? a.color : "#334155" }}>
                      {active && <span className="block h-full w-full rounded-full pulse-dot" style={{ background: a.color }} />}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{a.status}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground font-mono truncate">{a.task}</div>
                </div>
              </div>
              {active && (
                <div className="mt-2 h-0.5 w-full rounded bg-border overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${a.progress}%` }} transition={{ duration: 1 }} className="h-full" style={{ background: a.color }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Overview() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={FileSearch} label="APKs Analyzed Today" value={147} color="#6366F1" spark={sparkA} delta="+23%" deltaUp />
        <StatCard icon={ShieldAlert} label="Critical Threats" value={12} color="#EF4444" spark={sparkB} delta="+4 new" deltaUp />
        <StatCard icon={Clock} label="Avg Analysis Time" value={3.7} decimals={1} suffix="m" color="#22D3EE" spark={sparkC} delta="-12%" deltaUp={false} />
        <StatCard icon={Target} label="Detection Rate" value={98.7} decimals={1} suffix="%" color="#10B981" spark={sparkD} delta="+0.3%" deltaUp />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Pipeline />
        <AgentPanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <h3 className="text-sm font-semibold mb-1">Risk Distribution</h3>
          <p className="text-xs text-muted-foreground mb-2">Last 24h verdicts</p>
          <div className="relative h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={riskDist} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
                  {riskDist.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#12121A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-semibold tabular-nums">147</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">total</div>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {riskDist.map(r => (
              <div key={r.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} />
                <span className="text-muted-foreground">{r.name}</span>
                <span className="ml-auto tabular-nums">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold mb-1">Threat Trend</h3>
          <p className="text-xs text-muted-foreground mb-2">Submissions vs. detections · 30d</p>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={threatTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#64748B" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#64748B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#12121A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="submissions" stroke="#64748B" fill="url(#g1)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="threats" stroke="#EF4444" fill="url(#g2)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold mb-1">Top Malware Families</h3>
          <p className="text-xs text-muted-foreground mb-2">By sample count</p>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart layout="vertical" data={families} margin={{ top: 5, right: 15, left: 5, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#F1F5F9", fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ background: "#12121A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} animationDuration={1000}>
                  {families.map((f) => <Cell key={f.name} fill={f.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Recent Verdicts</h3>
            <p className="text-xs text-muted-foreground">Latest scored APKs</p>
          </div>
          <Link to="/analysis" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 font-medium"></th>
                <th className="py-2 font-medium">Package</th>
                <th className="py-2 font-medium">SHA-256</th>
                <th className="py-2 font-medium">Score</th>
                <th className="py-2 font-medium">Family</th>
                <th className="py-2 font-medium">Confidence</th>
                <th className="py-2 font-medium">Time</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {verdicts.map((v) => (
                <tr key={v.hash} className="border-b border-border/40 hover:bg-surface-hover/50 transition-colors">
                  <td className="py-3"><span className="inline-block h-2 w-2 rounded-full pulse-dot" style={{ background: statusColor[v.status] }} /></td>
                  <td className="py-3 font-mono text-xs">{v.pkg}</td>
                  <td className="py-3 font-mono text-xs text-muted-foreground">{v.hash}…</td>
                  <td className="py-3"><span className="rounded-md px-2 py-0.5 text-xs font-medium tabular-nums" style={{ background: `${statusColor[v.status]}22`, color: statusColor[v.status] }}>{v.score.toFixed(1)}</span></td>
                  <td className="py-3 text-xs"><span className="rounded-md border border-border bg-surface px-2 py-0.5 text-muted-foreground">{v.family}</span></td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-16 rounded bg-border overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${v.conf}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{v.conf}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">{v.time}</td>
                  <td className="py-3"><Link to="/analysis" className="text-xs text-primary hover:underline">View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
