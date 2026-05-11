import {
  Background,
  ConnectionMode,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";
// Phase 4.4 — lazy-load React Flow's stylesheet alongside the
// component itself. Keeping this import here (rather than in
// `main.tsx`) means Vite bundles the CSS into the AuditGraph chunk
// so first paint of the home page never downloads it.
import "reactflow/dist/style.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CircleDot,
  CircleOff,
  Filter,
  FileText,
  FolderTree,
  GitBranch,
  Layers3,
  Network,
  PackageSearch,
  Rocket,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";
import type { GraphNodeData, GraphPayload } from "../types/graph";
import {
  countByStatus,
  failingNodes,
  hiddenNodeIds,
  isEdgeHidden,
  STATUS_LABEL,
  STATUS_ORDER,
  toggleStatusInSet,
} from "./auditGraphHelpers";
import { useIsNarrowViewport } from "../lib/ui/useMediaQuery";

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

const STATUS_COLORS: Record<
  GraphNodeData["status"],
  { ring: string; bg: string; text: string; dot: string; edgeStroke: string }
> = {
  strong: {
    ring: "ring-aurora-mint/40",
    bg: "bg-aurora-mint/[0.08]",
    text: "text-aurora-mint",
    dot: "bg-aurora-mint",
    edgeStroke: "rgba(66,232,200,0.55)",
  },
  partial: {
    ring: "ring-aurora-violet/40",
    bg: "bg-aurora-violet/[0.08]",
    text: "text-aurora-violet",
    dot: "bg-aurora-violet",
    edgeStroke: "rgba(122,92,255,0.55)",
  },
  missing: {
    ring: "ring-risk-critical/50",
    bg: "bg-risk-critical/[0.08]",
    text: "text-risk-critical",
    dot: "bg-risk-critical",
    edgeStroke: "rgba(239,68,68,0.7)",
  },
  info: {
    ring: "ring-aurora-cyan/40",
    bg: "bg-aurora-cyan/[0.08]",
    text: "text-aurora-cyan",
    dot: "bg-aurora-cyan",
    edgeStroke: "rgba(58,214,255,0.45)",
  },
  unknown: {
    ring: "ring-white/10",
    bg: "bg-white/[0.04]",
    text: "text-slate-400",
    dot: "bg-slate-500",
    edgeStroke: "rgba(148,163,184,0.3)",
  },
  // Phase 7.0.5 — `not-applicable` matches `unknown` visually
  // (both are deliberately neutral, no-opinion states) but they
  // mean different things and carry different copy on the
  // detail panel. Keeping them visually distinguishable from
  // `missing` is the whole point of 7.0.5.
  "not-applicable": {
    ring: "ring-white/10",
    bg: "bg-white/[0.04]",
    text: "text-slate-400",
    dot: "bg-slate-500",
    edgeStroke: "rgba(148,163,184,0.25)",
  },
};

/**
 * Per-node-id icon mapping. Used to give each node a domain-meaningful
 * glyph instead of a generic dot — drastically improves at-a-glance
 * scanning for users who already know what an "Audit graph" looks like.
 * Falls back to `CircleDot` when an id isn't in the map (e.g. future
 * detector additions before we wire an icon).
 */
const NODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  repo: Network,
  documentation: FileText,
  readme: FileText,
  docs: ScrollText,
  source: FolderTree,
  languages: Layers3,
  structure: FolderTree,
  tests: CheckCircle2,
  ci: GitBranch,
  workflows: GitBranch,
  security: ShieldCheck,
  license: ShieldCheck,
  "security-md": ShieldAlert,
  quality: Target,
  maintenance: Activity,
  releases: Rocket,
  dx: Wrench,
  ecosystem: Boxes,
  deps: PackageSearch,
  "package-manager": PackageSearch,
  config: Wrench,
  risk: AlertTriangle,
};

/* -------------------------------------------------------------------------- */
/* Node                                                                        */
/* -------------------------------------------------------------------------- */

interface AuditNodeData extends GraphNodeData {
  /** Node id, kept on `data` so the renderer can pick its icon. */
  nodeId: string;
}

function GraphNodeView({ data, selected }: NodeProps<AuditNodeData>) {
  const palette = STATUS_COLORS[data.status];
  const Icon = NODE_ICONS[data.nodeId] ?? CircleDot;
  return (
    <div
      className={`min-w-[180px] rounded-xl border border-white/10 ${palette.bg} ${palette.ring} ring-1 backdrop-blur transition ${
        selected ? "shadow-glow" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${palette.text}`} />
          <span
            className={`inline-block h-2 w-2 rounded-full ${palette.dot}`}
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            {STATUS_LABEL[data.status]}
          </span>
        </div>
        <div className="mt-1 text-sm font-semibold text-white">{data.label}</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { auditNode: GraphNodeView };

/* -------------------------------------------------------------------------- */
/* Inner graph (needs the React Flow Provider context)                         */
/* -------------------------------------------------------------------------- */

interface AuditGraphProps {
  graph: GraphPayload;
}

function AuditGraphInner({ graph }: AuditGraphProps) {
  const { fitView } = useReactFlow();
  const [selectedId, setSelectedId] = useState<string | null>("repo");
  // Phase 5.10 — at narrow viewports, React Flow's default touch
  // handlers (panOnDrag, zoomOnScroll, preventScrolling) hijack the
  // single-finger scroll gesture, making the page wobble and stutter
  // when the graph enters the viewport. We disable those handlers
  // below the md breakpoint so vertical scroll passes through to the
  // page; pan/zoom remains accessible via the existing <Controls>
  // buttons + pinch-zoom (which is two-finger and doesn't conflict).
  const isNarrow = useIsNarrowViewport();
  // Status filter — when a status is in the set, nodes with that
  // status (and edges leading to/from them) are visible. Default
  // shows everything.
  const [activeStatuses, setActiveStatuses] = useState<
    Set<GraphNodeData["status"]>
  >(() => new Set(STATUS_ORDER));

  // Status counts drive the summary header. Computed once per graph
  // payload so re-filtering doesn't re-tally.
  const counts = useMemo(() => countByStatus(graph.nodes), [graph]);

  // Hidden nodes — anything whose status isn't currently active. The
  // root `repo` node is always visible regardless of the filter,
  // otherwise the graph turns into a disconnected mess.
  const hiddenIds = useMemo(
    () => hiddenNodeIds(graph.nodes, activeStatuses),
    [graph, activeStatuses],
  );

  // Build the React Flow node array — nodes carry `hidden` when the
  // status filter excludes them, plus we copy the id onto `data` so
  // the custom node renderer can pick its icon.
  const nodes = useMemo<Node<AuditNodeData>[]>(
    () =>
      graph.nodes.map((n) => ({
        id: n.id,
        type: "auditNode",
        position: n.position,
        data: { ...n.data, nodeId: n.id },
        draggable: false,
        hidden: hiddenIds.has(n.id),
      })),
    [graph, hiddenIds],
  );

  // Edge stroke is driven by the *target* node's status — that's the
  // reading direction users naturally follow. Edges leading to a
  // `missing` node also pulse so the eye is drawn there.
  const edges = useMemo<Edge[]>(() => {
    const targetStatusById = new Map<string, GraphNodeData["status"]>();
    for (const n of graph.nodes) targetStatusById.set(n.id, n.data.status);
    return graph.edges.map((e) => {
      const targetStatus = targetStatusById.get(e.target) ?? "unknown";
      const palette = STATUS_COLORS[targetStatus];
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: targetStatus === "missing",
        style: {
          stroke: palette.edgeStroke,
          strokeWidth: targetStatus === "missing" ? 2 : 1.4,
        },
        hidden: isEdgeHidden(e, hiddenIds),
      };
    });
  }, [graph, hiddenIds]);

  const selected =
    graph.nodes.find((n) => n.id === selectedId) ?? graph.nodes[0];

  const toggleStatus = useCallback((status: GraphNodeData["status"]) => {
    setActiveStatuses((prev) => toggleStatusInSet(prev, status));
  }, []);

  const showAll = useCallback(
    () => setActiveStatuses(new Set(STATUS_ORDER)),
    [],
  );

  const focusFailing = useCallback(() => {
    const failing = failingNodes(graph.nodes);
    if (failing.length === 0) return;
    void fitView({
      nodes: failing.map((n) => ({ id: n.id })),
      duration: 600,
      padding: 0.3,
    });
    // Pre-select the first failing node so the side panel updates too.
    setSelectedId(failing[0].id);
  }, [fitView, graph.nodes]);

  // When the filter changes, refit the visible portion so users always
  // see what they asked for. Skip on first paint — `fitView` defaults
  // already handle that case.
  useEffect(() => {
    if (activeStatuses.size === STATUS_ORDER.length) return;
    void fitView({ duration: 400, padding: 0.2 });
  }, [activeStatuses, fitView]);

  const failingCount = counts.missing + counts.partial;

  return (
    <section className="glass overflow-hidden print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-aurora-cyan" />
          <h3 className="text-sm font-semibold text-white">Audit graph</h3>
          <span className="text-[11px] text-slate-500">
            {graph.nodes.length} nodes
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={focusFailing}
            disabled={failingCount === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-aurora-amber/40 bg-aurora-amber/10 px-2.5 py-1 text-[11px] font-medium text-aurora-amber transition hover:bg-aurora-amber/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-slate-500"
            title={
              failingCount === 0
                ? "Nothing to focus — every category looks healthy."
                : `Focus the ${failingCount} failing node${failingCount === 1 ? "" : "s"}`
            }
          >
            <Target className="h-3 w-3" />
            Focus failing
          </button>
        </div>
      </div>

      {/* Filter chips — one per status. Counts hint how many nodes
          land in each bucket so users can plan their click. */}
      <div
        className="flex flex-wrap items-center gap-1.5 border-b border-white/5 px-6 py-2.5"
        role="toolbar"
        aria-label="Filter audit graph by status"
      >
        <Filter className="mr-1 h-3.5 w-3.5 text-slate-500" />
        {STATUS_ORDER.map((status) => {
          const palette = STATUS_COLORS[status];
          const active = activeStatuses.has(status);
          const count = counts[status];
          return (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                active
                  ? `${palette.ring.replace("ring-", "border-")} ${palette.bg} ${palette.text}`
                  : "border-white/10 bg-white/[0.02] text-slate-500 hover:border-white/20 hover:text-slate-300"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${palette.dot}`} />
              {STATUS_LABEL[status]}
              <span className="font-mono opacity-80">{count}</span>
            </button>
          );
        })}
        {activeStatuses.size < STATUS_ORDER.length ? (
          <button
            type="button"
            onClick={showAll}
            className="ml-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] px-2 py-0.5 text-[11px] font-medium text-slate-400 hover:text-white"
          >
            <CircleOff className="h-3 w-3" />
            Show all
          </button>
        ) : null}
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr,320px]">
        <div
          className="h-[480px] bg-[radial-gradient(circle_at_50%_50%,rgba(122,92,255,0.08),transparent_60%)]"
          // `touch-action: pan-y` (only on mobile) belt-and-suspenders
          // ensures the browser routes single-finger vertical
          // gestures to the page even if React Flow tried to capture
          // them. On wider viewports we leave it default so the
          // graph can still pan/zoom on a Mac trackpad / wheel mouse.
          style={isNarrow ? { touchAction: "pan-y" } : undefined}
        >
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
            // Phase 5.10 — mobile: hand the touch stream back to the
            // page so scrolling past the graph doesn't wobble.
            panOnDrag={!isNarrow}
            zoomOnScroll={!isNarrow}
            zoomOnDoubleClick={!isNarrow}
            preventScrolling={!isNarrow}
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

/* -------------------------------------------------------------------------- */
/* Public component                                                            */
/* -------------------------------------------------------------------------- */

export function AuditGraph({ graph }: AuditGraphProps) {
  // ReactFlowProvider gives the inner component access to imperative
  // viewport helpers (`fitView`) outside the `<ReactFlow>` subtree.
  return (
    <ReactFlowProvider>
      <AuditGraphInner graph={graph} />
    </ReactFlowProvider>
  );
}

// Phase 4.4 — default export is required by React.lazy. Consumers
// that don't care about the lazy split can keep using the named
// `AuditGraph` import; lazy consumers reach for `default`.
export default AuditGraph;
