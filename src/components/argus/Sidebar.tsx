import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Eye, Home, Upload, Search, Bot, Globe, Network, FileText, Settings, ChevronLeft } from "lucide-react";
import { useState } from "react";

const nav = [
  { to: "/", label: "Overview", icon: Home },
  { to: "/submissions", label: "Submissions", icon: Upload },
  { to: "/analysis", label: "Analysis", icon: Search },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/threat-map", label: "Threat Map", icon: Globe },
  { to: "/knowledge-graph", label: "Knowledge Graph", icon: Network },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const [open, setOpen] = useState(true);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? 240 : 72 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 z-40 h-screen border-r border-border bg-[#0c0c14]/90 backdrop-blur-xl flex flex-col"
    >
      <div className="flex h-16 items-center gap-3 px-4 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary glow-indigo">
          <Eye size={20} />
        </div>
        {open && (
          <div className="overflow-hidden">
            <div className="text-base font-semibold tracking-wider text-foreground">ARGUS</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">GenAI Malware Intel</div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className="block" title={!open ? item.label : undefined}>
              <div className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors ${active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"}`}>
                {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-primary" />}
                <Icon size={18} className={active ? "text-primary" : ""} />
                {open && <span className="text-sm">{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-primary to-cyan-accent grid place-items-center text-sm font-semibold">
            A
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-safe ring-2 ring-[#0c0c14] pulse-dot" />
          </div>
          {open && (
            <div className="overflow-hidden">
              <div className="text-sm text-foreground">Analyst</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">SOC · Tier 2</div>
            </div>
          )}
        </div>
        <button onClick={() => setOpen(!open)} className="mt-3 flex w-full items-center justify-center rounded-md py-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition">
          <ChevronLeft size={14} className={`transition-transform ${open ? "" : "rotate-180"}`} />
        </button>
      </div>
    </motion.aside>
  );
}
