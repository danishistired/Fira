import { createFileRoute } from "@tanstack/react-router";
import { FileText, Download } from "lucide-react";

export const Route = createFileRoute("/_argus/reports")({
  head: () => ({ meta: [{ title: "Reports · ARGUS" }] }),
  component: Reports,
});

const reports = [
  { title: "Weekly Threat Brief · W23", date: "2025-06-04", type: "CISO Brief", size: "2.4 MB" },
  { title: "Cerberus Campaign Analysis", date: "2025-06-03", type: "Deep Dive", size: "5.1 MB" },
  { title: "MITRE ATT&CK Coverage Audit", date: "2025-06-01", type: "Compliance", size: "1.8 MB" },
  { title: "Banking Trojans · Q2 Outlook", date: "2025-05-30", type: "Intelligence", size: "3.6 MB" },
  { title: "Sandbox Detonation Logs", date: "2025-05-28", type: "Raw", size: "12.4 MB" },
];

function Reports() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Generated Reports</h1>
        <p className="text-xs text-muted-foreground mt-1">Auto-synthesized by the AI reasoning layer</p>
      </div>
      <div className="glass rounded-xl p-2">
        {reports.map((r) => (
          <div key={r.title} className="flex items-center gap-4 p-4 border-b border-border last:border-0 hover:bg-surface-hover/40 rounded-lg transition">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><FileText size={18} /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.date} · {r.type} · {r.size}</div>
            </div>
            <button className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs hover:bg-surface-hover">
              <Download size={13} /> Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
