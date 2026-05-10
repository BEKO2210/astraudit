export type GraphNodeStatus = "strong" | "partial" | "missing" | "info" | "unknown";

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
