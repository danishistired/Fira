import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export const Route = createFileRoute("/_argus/knowledge-graph")({
  head: () => ({ meta: [{ title: "Knowledge Graph · ARGUS" }] }),
  component: KnowledgeGraph,
});

type N = d3.SimulationNodeDatum & { id: string; label: string; type: "apk" | "family" | "actor" | "mitre" | "c2"; meta?: string };
type L = d3.SimulationLinkDatum<N> & { rel: string };

const colorByType: Record<N["type"], string> = {
  apk: "#6366F1", family: "#EF4444", actor: "#F59E0B", mitre: "#22D3EE", c2: "#94A3B8",
};

const nodes: N[] = [
  { id: "apk1", label: "com.fake.hdfc.app", type: "apk" },
  { id: "apk2", label: "org.trojan.sms.stealer", type: "apk" },
  { id: "apk3", label: "net.malware.overlay.v3", type: "apk" },
  { id: "fam1", label: "Cerberus", type: "family" },
  { id: "fam2", label: "SharkBot", type: "family" },
  { id: "act1", label: "TA-505", type: "actor" },
  { id: "mit1", label: "T1453", type: "mitre", meta: "Accessibility" },
  { id: "mit2", label: "T1412", type: "mitre", meta: "Capture SMS" },
  { id: "mit3", label: "T1406", type: "mitre", meta: "Obfuscation" },
  { id: "c21", label: "185.234.72.19", type: "c2" },
  { id: "c22", label: "103.45.67.89", type: "c2" },
];

const links: L[] = [
  { source: "apk1", target: "fam1", rel: "is_a" },
  { source: "apk3", target: "fam1", rel: "is_a" },
  { source: "apk2", target: "fam2", rel: "is_a" },
  { source: "fam1", target: "act1", rel: "attributed_to" },
  { source: "apk1", target: "mit1", rel: "uses" },
  { source: "apk1", target: "mit2", rel: "uses" },
  { source: "apk2", target: "mit2", rel: "uses" },
  { source: "apk1", target: "mit3", rel: "uses" },
  { source: "apk3", target: "mit3", rel: "uses" },
  { source: "apk1", target: "c21", rel: "communicates_with" },
  { source: "apk2", target: "c22", rel: "communicates_with" },
  { source: "fam1", target: "c21", rel: "operates" },
];

function KnowledgeGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<N | null>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const W = 900, H = 600;
    const g = svg.append("g");
    svg.call(d3.zoom<SVGSVGElement, unknown>().on("zoom", (e) => g.attr("transform", e.transform)) as any);

    const sim = d3.forceSimulation<N>(nodes.map(n => ({...n})))
      .force("link", d3.forceLink<N, L>(links.map(l => ({...l}))).id((d: any) => d.id).distance(110))
      .force("charge", d3.forceManyBody().strength(-380))
      .force("center", d3.forceCenter(W/2, H/2))
      .force("collide", d3.forceCollide(36));

    const link = g.append("g").selectAll("line").data(sim.force<d3.ForceLink<N,L>>("link")!.links())
      .enter().append("line")
      .attr("stroke", "rgba(255,255,255,0.1)").attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 4").attr("class", "flow-line");

    const node = g.append("g").selectAll("g").data(sim.nodes()).enter().append("g").style("cursor", "pointer")
      .on("click", (_, d) => setSelected(d as N))
      .call(d3.drag<SVGGElement, N>()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }) as any);

    node.append("circle").attr("r", (d) => d.type === "apk" ? 18 : 14)
      .attr("fill", "#12121A")
      .attr("stroke", (d) => colorByType[d.type])
      .attr("stroke-width", 2);

    node.append("text").text((d) => d.label)
      .attr("y", 30).attr("text-anchor", "middle").attr("fill", "#64748B").attr("font-size", 10).attr("font-family", "JetBrains Mono");

    sim.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { sim.stop(); };
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge Graph</h1>
        <p className="text-xs text-muted-foreground mt-1">Threat relationship explorer · click nodes to inspect</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="glass rounded-xl p-3 lg:col-span-3">
          <svg ref={svgRef} viewBox="0 0 900 600" className="w-full h-[600px]" />
        </div>
        <div className="space-y-3">
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Legend</h3>
            <div className="space-y-2 text-xs">
              {Object.entries(colorByType).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: v }} />
                  <span className="capitalize text-muted-foreground">{k === "c2" ? "C2 Infra" : k === "mitre" ? "MITRE" : k}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Inspector</h3>
            {selected ? (
              <div className="space-y-2 text-xs">
                <div className="font-mono text-foreground">{selected.label}</div>
                <div className="text-muted-foreground capitalize">Type: {selected.type}</div>
                {selected.meta && <div className="text-muted-foreground">{selected.meta}</div>}
                <div className="pt-2 border-t border-border text-text-muted">
                  Connections: {links.filter(l => (l.source as any) === selected.id || (l.target as any) === selected.id || ((l.source as any).id === selected.id) || ((l.target as any).id === selected.id)).length}
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Select a node to inspect.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
