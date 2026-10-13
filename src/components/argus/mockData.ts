export const sparkA = [3, 5, 4, 7, 6, 9, 12].map((v, i) => ({ i, v }));
export const sparkB = [2, 4, 3, 6, 5, 8, 12].map((v, i) => ({ i, v }));
export const sparkC = [5, 4, 5, 4, 6, 5, 4].map((v, i) => ({ i, v }));
export const sparkD = [97, 98, 98, 99, 98, 99, 99].map((v, i) => ({ i, v }));

export const riskDist = [
  { name: "Critical", value: 12, color: "#EF4444" },
  { name: "High", value: 34, color: "#F59E0B" },
  { name: "Medium", value: 58, color: "#3B82F6" },
  { name: "Low", value: 43, color: "#10B981" },
];

export const families = [
  { name: "Cerberus", count: 18, color: "#EF4444" },
  { name: "SharkBot", count: 14, color: "#F59E0B" },
  { name: "Anubis", count: 11, color: "#3B82F6" },
  { name: "Hydra", count: 8, color: "#6366F1" },
  { name: "TeaBot", count: 6, color: "#22D3EE" },
];

export const threatTrend = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  submissions: Math.round(80 + Math.sin(i / 3) * 30 + Math.random() * 40),
  threats: Math.round(15 + Math.sin(i / 4) * 8 + Math.random() * 12),
}));

export const verdicts = [
  { status: "danger", pkg: "com.fake.hdfc.app", hash: "a1b2c3d4e5f6a7b8", score: 9.4, family: "Cerberus", conf: 96, time: "2m ago" },
  { status: "danger", pkg: "org.trojan.sms.stealer", hash: "9f8e7d6c5b4a3210", score: 9.1, family: "SharkBot", conf: 94, time: "5m ago" },
  { status: "warning", pkg: "net.adware.popup.v2", hash: "7c8d9e0f1a2b3c4d", score: 6.2, family: "Generic", conf: 71, time: "8m ago" },
  { status: "danger", pkg: "com.phish.gpay.clone", hash: "5e6f708192a3b4c5", score: 8.7, family: "Anubis", conf: 89, time: "12m ago" },
  { status: "warning", pkg: "org.spyware.tracker.lite", hash: "4d5e6f7081920a3b", score: 5.9, family: "Hydra", conf: 68, time: "18m ago" },
  { status: "safe", pkg: "com.secure.bankpay", hash: "1a2b3c4d5e6f7081", score: 1.2, family: "—", conf: 99, time: "22m ago" },
  { status: "danger", pkg: "net.malware.overlay.v3", hash: "0a1b2c3d4e5f6071", score: 9.6, family: "Cerberus", conf: 97, time: "31m ago" },
  { status: "safe", pkg: "com.legit.weather.app", hash: "8b9c0d1e2f304151", score: 0.4, family: "—", conf: 99, time: "44m ago" },
];

export const agents = [
  { id: "perm", icon: "🔒", name: "Permission Agent", status: "active", task: "Analyzing manifest of com.fake.hdfc.app", progress: 62, color: "#6366F1" },
  { id: "code", icon: "💻", name: "Code Agent", status: "active", task: "Decompiling DEX, checking DexClassLoader", progress: 48, color: "#22D3EE" },
  { id: "net", icon: "🌐", name: "Network Agent", status: "idle", task: "—", progress: 0, color: "#3B82F6" },
  { id: "beh", icon: "⚡", name: "Behavior Agent", status: "active", task: "Monitoring sandbox execution (2m 14s)", progress: 80, color: "#F59E0B" },
  { id: "ti", icon: "🕵️", name: "Threat Intel Agent", status: "active", task: "Querying VirusTotal + MalwareBazaar", progress: 35, color: "#EF4444" },
  { id: "mm", icon: "👁️", name: "Multimodal Agent", status: "idle", task: "—", progress: 0, color: "#10B981" },
];

export const pipelineStages = [
  { id: "upload", label: "Upload", icon: "📤", count: 4 },
  { id: "osint", label: "OSINT Triage", icon: "🌐", count: 2 },
  { id: "static", label: "Static Analysis", icon: "📄", count: 3 },
  { id: "sandbox", label: "Dynamic Sandbox", icon: "🧪", count: 5 },
  { id: "network", label: "Network Forensics", icon: "📡", count: 2 },
  { id: "intel", label: "Threat Intel", icon: "🕵️", count: 3 },
  { id: "agents", label: "AI Agents", icon: "🤖", count: 4 },
  { id: "verdict", label: "Verdict", icon: "⚖️", count: 1 },
];

export const c2Nodes = [
  { ip: "185.234.72.19", country: "Russia", isp: "RU-Center", firstSeen: "2025-05-12", family: "Cerberus", lat: 55.75, lon: 37.61 },
  { ip: "103.45.67.89", country: "China", isp: "Chinanet", firstSeen: "2025-05-28", family: "SharkBot", lat: 39.90, lon: 116.40 },
  { ip: "45.133.1.42", country: "Netherlands", isp: "WorldStream", firstSeen: "2025-04-19", family: "Anubis", lat: 52.37, lon: 4.89 },
  { ip: "91.219.236.18", country: "Ukraine", isp: "DataLine", firstSeen: "2025-06-01", family: "Hydra", lat: 50.45, lon: 30.52 },
  { ip: "172.86.75.12", country: "USA", isp: "ColoCrossing", firstSeen: "2025-05-30", family: "TeaBot", lat: 39.04, lon: -77.48 },
];

export const mitreMatrix = [
  { tactic: "Initial Access", techniques: [
    { id: "T1660", name: "Phishing", detected: true },
    { id: "T1456", name: "Drive-by Compromise", detected: false },
  ]},
  { tactic: "Execution", techniques: [
    { id: "T1623", name: "Command Scripting", detected: true },
    { id: "T1575", name: "Native API", detected: false },
  ]},
  { tactic: "Persistence", techniques: [
    { id: "T1624", name: "Event Triggered", detected: true },
    { id: "T1398", name: "Boot Init Scripts", detected: false },
  ]},
  { tactic: "Defense Evasion", techniques: [
    { id: "T1406", name: "Obfuscated Files", detected: true },
    { id: "T1407", name: "Download New Code", detected: true },
  ]},
  { tactic: "Collection", techniques: [
    { id: "T1412", name: "Capture SMS", detected: true },
    { id: "T1417", name: "Input Capture", detected: true },
    { id: "T1429", name: "Capture Audio", detected: false },
  ]},
  { tactic: "Impact", techniques: [
    { id: "T1453", name: "Abuse Accessibility", detected: true },
    { id: "T1471", name: "Data Encrypted", detected: false },
  ]},
];

export const shap = [
  { feature: "Accessibility Service abuse", value: 3.1 },
  { feature: "DexClassLoader usage", value: 2.4 },
  { feature: "Known C2 domain", value: 1.9 },
  { feature: "SMS interception", value: 1.8 },
  { feature: "Overlay permission", value: 1.1 },
  { feature: "Valid certificate", value: -0.3 },
  { feature: "Play Store presence", value: -0.6 },
];

export const activityLog = [
  { t: "14:23:05", agent: "🔒 Permission Agent", msg: "Found 14 dangerous permissions in com.fake.hdfc.app", color: "#6366F1" },
  { t: "14:23:08", agent: "💻 Code Agent", msg: "Detected DexClassLoader in class com.loader.PayloadManager", color: "#22D3EE" },
  { t: "14:23:12", agent: "🕵️ Threat Intel Agent", msg: "VirusTotal match: 48/72 detections, family: Cerberus", color: "#EF4444" },
  { t: "14:23:15", agent: "⚡ Behavior Agent", msg: "Sandbox alert: App registered AccessibilityService", color: "#F59E0B" },
  { t: "14:23:18", agent: "🏛️ Consensus Agent", msg: "All agents agree: MALICIOUS (confidence: 0.96)", color: "#10B981" },
  { t: "14:23:22", agent: "🌐 Network Agent", msg: "Outbound TLS to api.cerberus-panel.xyz (185.234.72.19)", color: "#3B82F6" },
  { t: "14:23:26", agent: "🔒 Permission Agent", msg: "BIND_ACCESSIBILITY_SERVICE requested at runtime", color: "#6366F1" },
  { t: "14:23:31", agent: "💻 Code Agent", msg: "String obfuscation detected (XOR + base64, 412 strings)", color: "#22D3EE" },
];
