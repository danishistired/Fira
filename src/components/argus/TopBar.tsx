import { Bell, Search } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

const titleMap: Record<string, string> = {
  "/": "Overview",
  "/submissions": "Submissions",
  "/analysis": "Analysis",
  "/agents": "Agents",
  "/threat-map": "Threat Map",
  "/knowledge-graph": "Knowledge Graph",
  "/reports": "Reports",
  "/settings": "Settings",
};

export function TopBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titleMap[pathname] ?? "ARGUS";

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="flex h-full items-center gap-6 px-6">
        <div className="text-xs text-muted-foreground">
          <span className="text-text-muted">ARGUS</span>
          <span className="mx-2 text-text-muted">/</span>
          <span className="text-foreground">{title}</span>
        </div>

        <div className="flex-1 max-w-xl mx-auto">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="global-search"
              placeholder="Search APKs, hashes, domains, threat actors…"
              className="w-full rounded-md bg-surface border border-border pl-9 pr-16 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:glow-indigo transition"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-background/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">⌘K</kbd>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-safe pulse-dot" />
            <span className="text-xs text-muted-foreground">System Online</span>
          </div>
          <button className="relative text-muted-foreground hover:text-foreground transition" id="notif-btn">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-danger text-[10px] font-semibold">3</span>
          </button>
          <select id="role-switch" className="rounded-md bg-surface border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/60">
            <option>SOC Analyst</option>
            <option>Threat Hunter</option>
            <option>CISO</option>
            <option>Compliance</option>
          </select>
        </div>
      </div>
    </header>
  );
}
