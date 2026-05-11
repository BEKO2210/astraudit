/**
 * Tests for the Phase 4.3 (rescoped) audit-graph helpers.
 *
 * The helpers drive the new filter chips, the edge-hidden cascade,
 * and the "Focus failing" button — all user-visible interactivity
 * that should be locked down before any future refactor reaches the
 * React Flow integration.
 */

import { describe, expect, it } from "vitest";
import {
  countByStatus,
  failingNodes,
  hiddenNodeIds,
  isEdgeHidden,
  STATUS_LABEL,
  STATUS_ORDER,
  toggleStatusInSet,
} from "../../src/components/auditGraphHelpers";
import type {
  GraphEdge,
  GraphNode,
  GraphNodeData,
} from "../../src/types/graph";

const node = (
  id: string,
  status: GraphNodeData["status"],
  label = id,
): GraphNode => ({
  id,
  position: { x: 0, y: 0 },
  data: {
    label,
    status,
    summary: "",
    evidence: [],
    recommendation: null,
  },
});

const edge = (id: string, source: string, target: string): GraphEdge => ({
  id,
  source,
  target,
});

const SAMPLE_NODES: GraphNode[] = [
  node("repo", "info", "Repository"),
  node("license", "strong"),
  node("readme", "partial"),
  node("security-md", "missing"),
  node("ci", "strong"),
  node("workflows", "strong"),
  node("tests", "missing"),
  node("structure", "unknown"),
];

describe("STATUS_ORDER + STATUS_LABEL", () => {
  it("orders statuses missing → partial → strong → info → unknown → not-applicable", () => {
    // Phase 7.0.5 — `not-applicable` joins `unknown` as the second
    // honest "no penalty" verdict (the file/pattern doesn't belong
    // on this stack). Both sit at the end of the filter-chip row
    // since they're the no-opinion states.
    expect(STATUS_ORDER).toEqual([
      "missing",
      "partial",
      "strong",
      "info",
      "unknown",
      "not-applicable",
    ]);
  });

  it("provides a non-empty label for every status, including the new 7.0.5 states", () => {
    expect(STATUS_LABEL.unknown).toBe("Unknown");
    expect(STATUS_LABEL["not-applicable"]).toBe("Not applicable");
    for (const s of STATUS_ORDER) {
      expect(STATUS_LABEL[s].length).toBeGreaterThan(0);
    }
  });
});

describe("countByStatus", () => {
  it("returns zero for every status when the node list is empty", () => {
    expect(countByStatus([])).toEqual({
      strong: 0,
      partial: 0,
      missing: 0,
      info: 0,
      unknown: 0,
      "not-applicable": 0,
    });
  });

  it("tallies the sample graph correctly", () => {
    expect(countByStatus(SAMPLE_NODES)).toEqual({
      strong: 3,
      partial: 1,
      missing: 2,
      info: 1,
      unknown: 1,
      "not-applicable": 0,
    });
  });
});

describe("hiddenNodeIds", () => {
  it("hides nothing when every status is active", () => {
    const out = hiddenNodeIds(SAMPLE_NODES, new Set(STATUS_ORDER));
    expect(out.size).toBe(0);
  });

  it("hides every non-`repo` node whose status is filtered out", () => {
    const out = hiddenNodeIds(SAMPLE_NODES, new Set(["strong"]));
    // Strong nodes stay visible (license, ci, workflows). Repo always
    // visible. Everything else hidden.
    expect(Array.from(out).sort()).toEqual(
      ["readme", "security-md", "structure", "tests"].sort(),
    );
  });

  it("never hides the root `repo` node, even when its own status is filtered out", () => {
    // repo's status is `info` — exclude `info` and verify it's still
    // visible. This is the explicit guard in the helper.
    const out = hiddenNodeIds(SAMPLE_NODES, new Set(["strong"]));
    expect(out.has("repo")).toBe(false);
  });
});

describe("isEdgeHidden", () => {
  const hidden = new Set(["security-md", "tests"]);

  it("is true when the source endpoint is hidden", () => {
    expect(isEdgeHidden(edge("e1", "tests", "repo"), hidden)).toBe(true);
  });

  it("is true when the target endpoint is hidden", () => {
    expect(isEdgeHidden(edge("e2", "repo", "security-md"), hidden)).toBe(true);
  });

  it("is false when both endpoints are visible", () => {
    expect(isEdgeHidden(edge("e3", "repo", "license"), hidden)).toBe(false);
  });
});

describe("toggleStatusInSet", () => {
  it("removes a status that's currently active", () => {
    const out = toggleStatusInSet(new Set(["missing", "strong"]), "missing");
    expect(out).toEqual(new Set(["strong"]));
  });

  it("adds a status that wasn't active", () => {
    const out = toggleStatusInSet(new Set(["strong"]), "missing");
    expect(out).toEqual(new Set(["strong", "missing"]));
  });

  it("never empties the set — toggling the last active status keeps it on", () => {
    const out = toggleStatusInSet(new Set(["missing"]), "missing");
    // Removing the last entry would leave the bare `repo` node, which
    // carries no information — guard re-adds the status.
    expect(out).toEqual(new Set(["missing"]));
  });

  it("returns a NEW set (caller's prev set is not mutated)", () => {
    const prev = new Set<GraphNodeData["status"]>(["strong"]);
    const out = toggleStatusInSet(prev, "missing");
    expect(out).not.toBe(prev);
    expect(prev).toEqual(new Set(["strong"]));
  });
});

describe("failingNodes", () => {
  it("returns missing + partial nodes, in the same order as the input", () => {
    const out = failingNodes(SAMPLE_NODES);
    expect(out.map((n) => n.id)).toEqual([
      "readme",
      "security-md",
      "tests",
    ]);
  });

  it("returns an empty array when nothing is failing", () => {
    expect(
      failingNodes([node("repo", "info"), node("license", "strong")]),
    ).toEqual([]);
  });

  it("excludes `info` and `unknown` — those aren't actionable failures", () => {
    expect(
      failingNodes([
        node("a", "info"),
        node("b", "unknown"),
        node("c", "strong"),
      ]),
    ).toEqual([]);
  });
});
