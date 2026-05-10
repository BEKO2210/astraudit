/**
 * Pure helpers for `<AuditGraph />`. Lives in its own file so vitest
 * (node env, no DOM) can exercise the filtering / counting / edge-
 * styling logic without touching React Flow.
 *
 * Phase 4.3 (rescoped to "Audit graph improvements").
 */

import type { GraphEdge, GraphNode, GraphNodeData } from "../types/graph";

export const STATUS_ORDER: GraphNodeData["status"][] = [
  "missing",
  "partial",
  "strong",
  "info",
  "unknown",
];

export const STATUS_LABEL: Record<GraphNodeData["status"], string> = {
  strong: "Strong",
  partial: "Partial",
  missing: "Missing",
  info: "Info",
  unknown: "Not detected",
};

/** Tally nodes by status — drives the filter chip badges + the
 *  "Focus failing" disabled state. */
export function countByStatus(
  nodes: readonly GraphNode[],
): Record<GraphNodeData["status"], number> {
  const out: Record<GraphNodeData["status"], number> = {
    strong: 0,
    partial: 0,
    missing: 0,
    info: 0,
    unknown: 0,
  };
  for (const n of nodes) out[n.data.status] += 1;
  return out;
}

/**
 * Compute which node ids should be hidden under the current status
 * filter. The root `repo` node is always visible — hiding it would
 * disconnect the entire graph from its anchor and make the rest
 * impossible to read.
 */
export function hiddenNodeIds(
  nodes: readonly GraphNode[],
  activeStatuses: ReadonlySet<GraphNodeData["status"]>,
): Set<string> {
  const ids = new Set<string>();
  for (const n of nodes) {
    if (n.id === "repo") continue;
    if (!activeStatuses.has(n.data.status)) ids.add(n.id);
  }
  return ids;
}

/**
 * An edge is hidden when *either* endpoint is hidden. Using a hidden
 * source-only check would leave dangling edges drifting in space; an
 * "either endpoint" check keeps the visible portion clean.
 */
export function isEdgeHidden(
  edge: GraphEdge,
  hidden: ReadonlySet<string>,
): boolean {
  return hidden.has(edge.source) || hidden.has(edge.target);
}

/**
 * Pick the next status set when the user clicks a filter chip:
 * toggles the chip in/out of the active set, but never lets the set
 * empty out — clearing every chip would leave the bare `repo` node,
 * which carries no information.
 */
export function toggleStatusInSet(
  current: ReadonlySet<GraphNodeData["status"]>,
  status: GraphNodeData["status"],
): Set<GraphNodeData["status"]> {
  const next = new Set(current);
  if (next.has(status)) {
    next.delete(status);
    if (next.size === 0) next.add(status);
  } else {
    next.add(status);
  }
  return next;
}

/** Nodes the "Focus failing" button should pan to — anything that
 *  isn't actively healthy. Empty array → button disables itself. */
export function failingNodes(
  nodes: readonly GraphNode[],
): readonly GraphNode[] {
  return nodes.filter(
    (n) => n.data.status === "missing" || n.data.status === "partial",
  );
}
