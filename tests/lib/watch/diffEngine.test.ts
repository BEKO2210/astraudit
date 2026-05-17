import { describe, expect, it } from "vitest";
import { diffWatchSnapshot } from "../../../src/lib/watch/diffEngine";
import type { WatchedRepo } from "../../../src/lib/watch/watchStore";

function makeEntry(overrides: Partial<WatchedRepo> = {}): WatchedRepo {
  return {
    owner: "a",
    repo: "b",
    fullName: "a/b",
    addedAt: "2026-01-01T00:00:00Z",
    lastCheckedAt: "2026-05-01T00:00:00Z",
    lastScore: 80,
    lastMaxScore: 100,
    lastGrade: "B",
    lastFindingCount: 5,
    intervalHours: 24,
    ...overrides,
  };
}

const NOW = Date.parse("2026-05-17T00:00:00Z");

describe("diffWatchSnapshot (M7.1.3)", () => {
  it("returns [] when no baseline exists yet (first check)", () => {
    const entry = makeEntry({
      lastScore: null,
      lastFindingCount: null,
      lastGrade: null,
    });
    const events = diffWatchSnapshot(
      entry,
      { totalScore: 80, maxScore: 100, grade: "B", findingCount: 3 },
      NOW,
    );
    expect(events).toEqual([]);
  });

  it("emits score-up with positive delta when score improved", () => {
    const events = diffWatchSnapshot(
      makeEntry(),
      { totalScore: 90, maxScore: 100, grade: "B", findingCount: 5 },
      NOW,
    );
    const score = events.find((e) => e.kind.startsWith("score"));
    expect(score?.kind).toBe("score-up");
    expect(score?.delta).toBe(10);
    expect(score?.before).toBe(80);
    expect(score?.after).toBe(90);
  });

  it("emits score-down with negative delta when score regressed", () => {
    const events = diffWatchSnapshot(
      makeEntry(),
      { totalScore: 70, maxScore: 100, grade: "B", findingCount: 5 },
      NOW,
    );
    const score = events.find((e) => e.kind.startsWith("score"));
    expect(score?.kind).toBe("score-down");
    expect(score?.delta).toBe(-10);
  });

  it("emits findings-up when finding count grew", () => {
    const events = diffWatchSnapshot(
      makeEntry(),
      { totalScore: 80, maxScore: 100, grade: "B", findingCount: 9 },
      NOW,
    );
    const findings = events.find((e) => e.kind.startsWith("findings"));
    expect(findings?.kind).toBe("findings-up");
    expect(findings?.delta).toBe(4);
  });

  it("emits findings-down when finding count shrunk", () => {
    const events = diffWatchSnapshot(
      makeEntry(),
      { totalScore: 80, maxScore: 100, grade: "B", findingCount: 2 },
      NOW,
    );
    const findings = events.find((e) => e.kind.startsWith("findings"));
    expect(findings?.kind).toBe("findings-down");
    expect(findings?.delta).toBe(-3);
  });

  it("emits grade-changed only when the letter actually changed", () => {
    const same = diffWatchSnapshot(
      makeEntry(),
      { totalScore: 80, maxScore: 100, grade: "B", findingCount: 5 },
      NOW,
    );
    expect(same.find((e) => e.kind === "grade-changed")).toBeUndefined();

    const changed = diffWatchSnapshot(
      makeEntry(),
      { totalScore: 80, maxScore: 100, grade: "A", findingCount: 5 },
      NOW,
    );
    const grade = changed.find((e) => e.kind === "grade-changed");
    expect(grade?.before).toBe("B");
    expect(grade?.after).toBe("A");
    expect(grade?.delta).toBeNull();
  });

  it("can emit multiple events at once for a multi-dimensional change", () => {
    const events = diffWatchSnapshot(
      makeEntry(),
      { totalScore: 95, maxScore: 100, grade: "A", findingCount: 2 },
      NOW,
    );
    const kinds = events.map((e) => e.kind).sort();
    expect(kinds).toContain("score-up");
    expect(kinds).toContain("findings-down");
    expect(kinds).toContain("grade-changed");
  });

  it("stamps every event with the supplied `now` timestamp", () => {
    const events = diffWatchSnapshot(
      makeEntry(),
      { totalScore: 90, maxScore: 100, grade: "B", findingCount: 5 },
      NOW,
    );
    for (const e of events) {
      expect(e.occurredAt).toBe("2026-05-17T00:00:00.000Z");
    }
  });
});
