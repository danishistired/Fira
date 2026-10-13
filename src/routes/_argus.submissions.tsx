import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Upload, FileUp } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_argus/submissions")({
  head: () => ({ meta: [{ title: "Submissions · ARGUS" }] }),
  component: Submissions,
});

const queue = [
  { name: "com.fake.hdfc.app.apk", status: "Analyzing", progress: 78, eta: "1m 12s" },
  { name: "org.trojan.sms.stealer.apk", status: "Processing", progress: 42, eta: "2m 04s" },
  { name: "net.adware.popup.v2.apk", status: "Queued", progress: 0, eta: "—" },
  { name: "com.phish.gpay.clone.apk", status: "Complete", progress: 100, eta: "done" },
  { name: "com.secure.bankpay.apk", status: "Complete", progress: 100, eta: "done" },
];
const filters = ["All", "Pending", "In Progress", "Completed", "Critical"];

function Submissions() {
  const [filter, setFilter] = useState("All");
  const [drag, setDrag] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">APK Submissions</h1>
          <p className="text-xs text-muted-foreground mt-1">Upload binaries for multi-agent triage</p>
        </div>
        <button id="upload-btn" className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition glow-indigo">
          <Upload size={16} /> Upload APK
        </button>
      </div>

      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); }}
        animate={{ borderColor: drag ? "#6366F1" : "rgba(255,255,255,0.1)" }}
        className="glass rounded-xl border-2 border-dashed p-12 text-center"
      >
        <FileUp size={36} className="mx-auto text-primary mb-3" />
        <div className="text-sm font-medium">Drag & drop APK file or click to browse</div>
        <p className="mt-1 text-xs text-muted-foreground">Supported: .apk · max 200 MB · SHA-256 verified on receipt</p>
      </motion.div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs transition ${filter === f ? "bg-primary/15 text-primary border border-primary/40" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}
          >{f}</button>
        ))}
      </div>

      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Queue</h3>
        <div className="space-y-3">
          {queue.map((q) => (
            <div key={q.name} className="rounded-lg border border-border bg-surface/60 p-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs">{q.name}</div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{q.status}</span>
                  <span className="font-mono">{q.eta}</span>
                </div>
              </div>
              <div className="mt-3 h-1 rounded bg-border overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${q.progress}%` }} transition={{ duration: 1 }} className="h-full bg-gradient-to-r from-primary to-cyan-accent" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
