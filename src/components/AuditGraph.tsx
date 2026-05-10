import {
  Background,
  ConnectionMode,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";
import { useMemo, useState } from "react";
import { CircleDot, Network, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import type { GraphNodeData, GraphPayload } from "../types/graph";

const STATUS_COLORS: Record<
  GraphNodeData["status"],
  { ring: string; bg: string; text: string; dot: string }
> = {
  strong: {
    ring: "ring-aurora-mint/40",
    bg: "bg-aurora-mint/[0.08]",
    text: "text-aurora-mint",
    dot: "bg-aurora-mint",
  },
  partial: {
    ring: "ring-aurora-violet/40",
    bg: "bg-aurora-violet/[0.08]",
    text: "text-aurora-violet",
    dot: "bg-aurora-violet",
  },
  missing: {
    ring: "ring-risk-critical/40",
    bg: "bg-risk-critical/[0.08]",
    text: "text-risk-critical",
    dot: "bg-risk-critical",
  },
  info: {
    ring: "ring-aurora-cyan/40",
    bg: "bg-aurora-cyan/[0.08]",
    text: "text-aurora-cyan",
    dot: "bg-aurora-cyan",
  },
  unknown: {
    ring: "ring-white/10",
    bg: "bg-white/[0.04]",
    text: "text-slate-400",
    dot: "bg-slate-500",
  },
};

function GraphNodeView({ data, selected }: NodeProps<GraphNodeData>) {
  const palette = STATUS_COLORS[data.status];
  return (
    <div
      className={`min-w-[180px] rounded-xl border border-white/10 ${palette.bg} ${palette.ring} ring-1 backdrop-blur transition ${
        selected ? "shadow-glow" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${palette.dot}`}
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            {data.status === "unknown" ? "Not detected" : data.status}
          </span>
        </div>
        <div className="mt-1 text-sm font-semibold text-white">{data.label}</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { auditNode: GraphNodeView };

interface AuditGraphProps {
  graph: GraphPayload;
}

export function AuditGraph({ graph }: AuditGraphProps) {
  const [selectedId, setSelectedId] = useState<string | null>("repo");

  const nodes = useMemo<Node<GraphNodeData>[]>(
    () =>
      graph.nodes.map((n) => ({
        id: n.id,
        type: "auditNode",
        position: n.position,
        data: n.data,
        draggable: false,
      })),
    [graph],
  );

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: false,
        style: { stroke: "rgba(122,92,255,0.45)" },
      })),
    [graph],
  );

  const selected =
    graph.nodes.find((n) => n.id === selectedId) ?? graph.nodes[0];

  return (
    <section className="glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-6 py-4">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-aurora-cyan" />
          <h3 className="text-sm font-semibold text-white">Audit graph</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <Legend dot="bg-aurora-mint" label="Strong" />
          <Legend dot="bg-aurora-violet" label="Partial" />
          <Legend dot="bg-risk-critical" label="Missing" />
          <Legend dot="bg-aurora-cyan" label="Info" />
          <Legend dot="bg-slate-500" label="Not detected" />
        </div>
      </div>
      <div className="grid gap-0 lg:grid-cols-[1fr,320px]">
        <div className="h-[480px] bg-[radial-gradient(circle_at_50%_50%,rgba(122,92,255,0.08),transparent_60%)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            connectionMode={ConnectionMode.Loose}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            proOptions={{ hideAttribution: false }}
            onNodeClick={(_, node) => setSelectedId(node.id)}
          >
            <Background gap={24} color="rgba(255,255,255,0.05)" />
            <Controls
              showInteractive={false}
              className="!bg-ink-800/80 !border-white/5 [&>button]:!bg-transparent [&>button]:!text-slate-200 [&>button]:!border-white/5"
            />
          </ReactFlow>
        </div>
        <aside className="border-t border-white/5 p-5 lg:border-l lg:border-t-0">
          {selected ? (
            <div>
              <div className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-aurora-violet" />
                <h4 className="text-sm font-semibold text-white">
                  {selected.data.label}
                </h4>
              </div>
              <p className="mt-2 text-sm text-slate-300/90">
                {selected.data.summary}
              </p>
              {selected.data.evidence.length > 0 ? (
                <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
                  {selected.data.evidence.map((ev, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aurora-cyan/70" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {selected.data.recommendation ? (
                    <ShieldAlert className="h-3.5 w-3.5 text-risk-medium" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5 text-aurora-mint" />
                  )}
                  Recommendation
                </div>
                <p className="mt-1.5 text-sm text-slate-200">
                  {selected.data.recommendation ?? "Looks good — no action required."}
                </p>
              </div>
              <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                <Sparkles className="h-3 w-3" />
                Click any node in the graph for details.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

interface LegendProps {
  dot: string;
  label: string;
}

function Legend({ dot, label }: LegendProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
