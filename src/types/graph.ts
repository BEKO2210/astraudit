/**
 * Phase 7.0.5 — `unknown` and `not-applicable` are the two states
 * added for honest verdicts when the public surface doesn't carry
 * the data (unknown) or the file/pattern doesn't belong on this
 * stack (not-applicable). See `src/types/audit.ts` `CategoryStatus`
 * for the score-model contract.
 */
export type GraphNodeStatus =
  | "strong"
  | "partial"
  | "missing"
  | "info"
  | "unknown"
  | "not-applicable";

export interface GraphNodeData {
  label: string;
  status: GraphNodeStatus;
  summary: string;
  evidence: string[];
  recommendation: string | null;
}

export interface GraphNode {
  id: string;
  position: { x: number; y: number };
  data: GraphNodeData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
