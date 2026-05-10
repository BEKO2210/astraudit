import { describe, expect, it } from "vitest";
import {
  buildHeatmapGrid,
  countCommitsByDay,
  HEATMAP_DAYS,
  intensityBucket,
  monIndex,
  toIsoDay,
} from "../../../src/lib/audit/activityHeatmap";
import type { CommitInfo } from "../../../src/types/github";

function commit(date: string): CommitInfo {
  return {
    sha: `sha-${date}`,
    message: "msg",
    authorName: "Author",
    authorDate: date,
  };
}

describe("toIsoDay", () => {
  it("formats UTC as YYYY-MM-DD", () => {
    expect(toIsoDay(new Date("2026-05-10T15:30:00Z"))).toBe("2026-05-10");
  });

  it("handles single-digit month/day", () => {
    expect(toIsoDay(new Date("2026-01-05T00:00:00Z"))).toBe("2026-01-05");
  });
});

describe("monIndex", () => {
  it("returns 0 for Monday, 6 for Sunday", () => {
    expect(monIndex(new Date("2026-05-04T12:00:00Z"))).toBe(0); // Mon
    expect(monIndex(new Date("2026-05-08T12:00:00Z"))).toBe(4); // Fri
    expect(monIndex(new Date("2026-05-10T12:00:00Z"))).toBe(6); // Sun
  });
});

describe("countCommitsByDay", () => {
  it("counts commits per UTC day", () => {
    const map = countCommitsByDay([
      commit("2026-05-10T01:00:00Z"),
      commit("2026-05-10T23:00:00Z"),
      commit("2026-05-09T12:00:00Z"),
    ]);
    expect(map.get("2026-05-10")).toBe(2);
    expect(map.get("2026-05-09")).toBe(1);
    expect(map.size).toBe(2);
  });

  it("ignores commits with missing or invalid dates", () => {
    const map = countCommitsByDay([
      { sha: "a", message: "x", authorName: null, authorDate: null },
      { sha: "b", message: "x", authorName: null, authorDate: "not a date" },
      commit("2026-05-10T00:00:00Z"),
    ]);
    expect(map.size).toBe(1);
  });
});

describe("buildHeatmapGrid", () => {
  it("produces exactly HEATMAP_DAYS cells", () => {
    const grid = buildHeatmapGrid(
      [commit("2026-05-10T12:00:00Z")],
      new Date("2026-05-10T12:00:00Z"),
    );
    expect(grid.cells).toHaveLength(HEATMAP_DAYS);
    expect(grid.total).toBe(1);
  });

  it("buckets multiple commits on the same day", () => {
    const grid = buildHeatmapGrid(
      [
        commit("2026-05-08T01:00:00Z"),
        commit("2026-05-08T11:00:00Z"),
        commit("2026-05-08T22:00:00Z"),
      ],
      new Date("2026-05-10T12:00:00Z"),
    );
    expect(grid.total).toBe(3);
    expect(grid.max).toBe(3);
    expect(grid.uniqueDays).toBe(1);
    const target = grid.cells.find((c) => c.date === "2026-05-08");
    expect(target?.count).toBe(3);
  });

  it("zeros out days that fall outside the commit set", () => {
    const grid = buildHeatmapGrid(
      [commit("2026-05-08T12:00:00Z")],
      new Date("2026-05-10T12:00:00Z"),
    );
    const empty = grid.cells.filter((c) => c.count === 0);
    expect(empty.length).toBe(HEATMAP_DAYS - 1);
  });

  it("aligns the last column to the current week (Sunday end)", () => {
    // 2026-05-10 is a Sunday — endDate must equal it.
    const grid = buildHeatmapGrid([], new Date("2026-05-10T12:00:00Z"));
    expect(grid.endDate).toBe("2026-05-10");
  });

  it("survives an empty commit list", () => {
    const grid = buildHeatmapGrid([], new Date("2026-05-10T12:00:00Z"));
    expect(grid.cells).toHaveLength(HEATMAP_DAYS);
    expect(grid.total).toBe(0);
    expect(grid.max).toBe(0);
    expect(grid.uniqueDays).toBe(0);
  });
});

describe("intensityBucket", () => {
  it("returns 0 for empty cells", () => {
    expect(intensityBucket(0, 5)).toBe(0);
  });

  it("returns 4 when count is at or above 75% of max", () => {
    expect(intensityBucket(8, 10)).toBe(4);
    expect(intensityBucket(10, 10)).toBe(4);
  });

  it("scales by ratio (1 commit, max 1 -> top bucket)", () => {
    expect(intensityBucket(1, 1)).toBe(4);
  });

  it("returns 1/2/3 for the lower bands", () => {
    expect(intensityBucket(1, 10)).toBe(1);
    expect(intensityBucket(3, 10)).toBe(2);
    expect(intensityBucket(6, 10)).toBe(3);
  });
});
