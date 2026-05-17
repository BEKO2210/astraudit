import { describe, expect, it } from "vitest";
import {
  computeTrends,
  summariseTrends,
  type TrendInputRow,
} from "../../../src/lib/leaderboard/trends";

function row(name: string, score: number | null): TrendInputRow {
  return { fullName: name, totalScore: score };
}

describe("computeTrends (M6.5)", () => {
  it("marks rows present in both with up/down/same and the right delta", () => {
    const trends = computeTrends(
      [row("a", 80), row("b", 70), row("c", 90)],
      [row("a", 75), row("b", 70), row("c", 92)],
    );
    expect(trends.get("a")?.direction).toBe("up");
    expect(trends.get("a")?.delta).toBe(5);
    expect(trends.get("b")?.direction).toBe("same");
    expect(trends.get("b")?.delta).toBe(0);
    expect(trends.get("c")?.direction).toBe("down");
    expect(trends.get("c")?.delta).toBe(-2);
  });

  it("marks rows that only exist in the latest set as `new`", () => {
    const trends = computeTrends(
      [row("a", 80), row("b", 70)],
      [row("a", 75)],
    );
    expect(trends.get("b")?.direction).toBe("new");
    expect(trends.get("b")?.delta).toBeNull();
    expect(trends.get("b")?.previousScore).toBeNull();
  });

  it("marks rows that fell out of the latest set as `dropped`", () => {
    const trends = computeTrends(
      [row("a", 80)],
      [row("a", 75), row("b", 70)],
    );
    expect(trends.get("b")?.direction).toBe("dropped");
    expect(trends.get("b")?.previousScore).toBe(70);
    expect(trends.get("b")?.latestScore).toBeNull();
  });

  it("propagates null scores to delta: null + direction: same", () => {
    const trends = computeTrends(
      [row("a", null)],
      [row("a", 75)],
    );
    expect(trends.get("a")?.delta).toBeNull();
    expect(trends.get("a")?.direction).toBe("same");
  });

  it("preserves the latest score on the trend record", () => {
    const trends = computeTrends(
      [row("a", 90)],
      [row("a", 80)],
    );
    expect(trends.get("a")?.latestScore).toBe(90);
    expect(trends.get("a")?.previousScore).toBe(80);
  });

  it("returns an empty map when both inputs are empty", () => {
    expect(computeTrends([], [])).toEqual(new Map());
  });
});

describe("summariseTrends", () => {
  it("counts every direction bucket", () => {
    const trends = computeTrends(
      [row("a", 80), row("b", 70), row("c", 60), row("d", 50), row("e", 90)],
      [row("a", 75), row("b", 70), row("c", 65), row("z", 40)],
    );
    const summary = summariseTrends(trends);
    expect(summary.up).toBe(1); // a
    expect(summary.same).toBe(1); // b
    expect(summary.down).toBe(1); // c
    expect(summary.newRepos).toBe(2); // d, e
    expect(summary.dropped).toBe(1); // z
  });

  it("returns zeros for an empty trend map", () => {
    expect(summariseTrends(new Map())).toEqual({
      up: 0,
      down: 0,
      same: 0,
      newRepos: 0,
      dropped: 0,
    });
  });
});
