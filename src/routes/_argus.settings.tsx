import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_argus/settings")({
  head: () => ({ meta: [{ title: "Settings · ARGUS" }] }),
  component: Settings,
});

const sections = [
  { title: "Detection Sensitivity", desc: "Risk score threshold for auto-quarantine", value: "7.5 / 10" },
  { title: "Sandbox Timeout", desc: "Max dynamic execution duration", value: "180s" },
  { title: "Threat Intel Sources", desc: "VirusTotal · MalwareBazaar · AlienVault OTX", value: "3 active" },
  { title: "Webhook Alerts", desc: "Slack #soc-alerts on Critical verdicts", value: "Enabled" },
  { title: "Retention Policy", desc: "Sandbox artifacts & PCAPs", value: "90 days" },
];

function Settings() {
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">Platform configuration</p>
      </div>
      <div className="glass rounded-xl divide-y divide-border">
        {sections.map((s) => (
          <div key={s.title} className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm font-medium">{s.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
            </div>
            <div className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-mono">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
