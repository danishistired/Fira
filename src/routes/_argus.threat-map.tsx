import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import { c2Nodes } from "@/components/argus/mockData";

export const Route = createFileRoute("/_argus/threat-map")({
  head: () => ({ meta: [{ title: "Threat Map · ARGUS" }] }),
  component: ThreatMap,
});

// Minimal land geometry: use a tiny inline graticule + arcs only; render countries as simple sphere outline (avoid heavy topojson fetch).
function ThreatMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rotate, setRotate] = useState<[number, number]>([0, -20]);
  const draggingRef = useRef(false);
  const lastRef = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    if (draggingRef.current) return;
    const id = setInterval(() => {
      setRotate(([l, lat]) => [(l + 0.3) % 360, lat]);
    }, 50);
    return () => clearInterval(id);
  }, []);

  const W = 600, H = 600;
  const projection = d3.geoOrthographic().translate([W / 2, H / 2]).scale(260).rotate([rotate[0], rotate[1]]).clipAngle(90);
  const path = d3.geoPath(projection);
  const graticule = d3.geoGraticule10();

  const origin: [number, number] = [77.10, 28.70]; // New Delhi (analyzed APK)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Global Threat Map</h1>
        <p className="text-xs text-muted-foreground mt-1">C2 infrastructure geolocation · live</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="glass rounded-xl p-5 lg:col-span-3">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-[600px] cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => { draggingRef.current = true; lastRef.current = [e.clientX, e.clientY]; }}
            onMouseUp={() => { draggingRef.current = false; }}
            onMouseLeave={() => { draggingRef.current = false; }}
            onMouseMove={(e) => {
              if (!draggingRef.current) return;
              const dx = e.clientX - lastRef.current[0];
              const dy = e.clientY - lastRef.current[1];
              lastRef.current = [e.clientX, e.clientY];
              setRotate(([l, lat]) => [l + dx * 0.4, Math.max(-80, Math.min(80, lat - dy * 0.4))]);
            }}
          >
            <defs>
              <radialGradient id="globe-g">
                <stop offset="0%" stopColor="#1A1A25" />
                <stop offset="100%" stopColor="#0A0A0F" />
              </radialGradient>
            </defs>
            <circle cx={W/2} cy={H/2} r={260} fill="url(#globe-g)" stroke="rgba(99,102,241,0.2)" strokeWidth={1} />
            <path d={path(graticule) || ""} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />

            {/* arcs from origin to each c2 */}
            {c2Nodes.map((c, i) => {
              const arc = { type: "LineString" as const, coordinates: [origin, [c.lon, c.lat]] };
              return <path key={i} d={path(arc) || ""} fill="none" stroke="#22D3EE" strokeWidth={1} className="flow-line" opacity={0.7} />;
            })}

            {/* origin */}
            {(() => { const p = projection(origin); return p && <circle cx={p[0]} cy={p[1]} r={4} fill="#6366F1" className="pulse-dot" />; })()}

            {/* c2 nodes */}
            {c2Nodes.map((c, i) => {
              const p = projection([c.lon, c.lat]);
              if (!p) return null;
              return (
                <g key={i}>
                  <circle cx={p[0]} cy={p[1]} r={8} fill="#EF4444" opacity={0.3} className="pulse-dot" />
                  <circle cx={p[0]} cy={p[1]} r={3} fill="#EF4444" />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Detected C2 Infrastructure</h3>
          <div className="space-y-3">
            {c2Nodes.map((c) => (
              <div key={c.ip} className="rounded-lg border border-border bg-surface/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs text-danger">{c.ip}</div>
                  <span className="rounded text-[9px] font-semibold bg-danger/15 text-danger px-1.5 py-0.5">{c.family}</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{c.country} · {c.isp}</div>
                <div className="mt-1 text-[10px] text-text-muted font-mono">First seen: {c.firstSeen}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
