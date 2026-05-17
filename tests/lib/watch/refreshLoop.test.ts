/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  runWatchRefresh,
  type RefreshProgress,
} from "../../../src/lib/watch/refreshLoop";
import {
  clearAllWatched,
  getWatched,
  watchRepo,
} from "../../../src/lib/watch/watchStore";
import { clearAllEvents, listEvents } from "../../../src/lib/watch/eventStore";
import { RateLimitError } from "../../../src/lib/github/githubClient";

beforeEach(() => {
  clearAllWatched();
  clearAllEvents();
});
afterEach(() => {
  clearAllWatched();
  clearAllEvents();
});

describe("runWatchRefresh (M7.1.3)", () => {
  it("does nothing when nothing is due", async () => {
    const auditOne = vi.fn();
    // No watched repos; nothing to do.
    const summary = await runWatchRefresh({ auditOne });
    expect(summary.refreshed).toBe(0);
    expect(summary.skipped).toBe(0);
    expect(auditOne).not.toHaveBeenCalled();
  });

  it("audits every due repo and seeds + diffs the baseline", async () => {
    watchRepo(
      { owner: "a", repo: "b" },
      { totalScore: 80, maxScore: 100, grade: "B", findingCount: 5 },
    );
    // Force-expire the lastCheckedAt by walking time forward.
    const future = Date.now() + 9 * 24 * 60 * 60 * 1000;
    const auditOne = vi.fn(async () => ({
      totalScore: 90,
      maxScore: 100,
      grade: "A",
      findingCount: 2,
    }));
    const summary = await runWatchRefresh({
      auditOne,
      now: () => future,
    });
    expect(summary.refreshed).toBe(1);
    // 3 events: score-up, findings-down, grade-changed.
    expect(summary.events.map((e) => e.kind).sort()).toEqual(
      ["findings-down", "grade-changed", "score-up"].sort(),
    );
    expect(listEvents()).toHaveLength(3);
    const refreshed = getWatched({ owner: "a", repo: "b" });
    expect(refreshed?.lastScore).toBe(90);
    expect(refreshed?.lastGrade).toBe("A");
    expect(refreshed?.lastFindingCount).toBe(2);
  });

  it("skips repos inside their refresh window", async () => {
    watchRepo(
      { owner: "a", repo: "fresh" },
      { totalScore: 80, maxScore: 100, grade: "B", findingCount: 5 },
    );
    const auditOne = vi.fn();
    const summary = await runWatchRefresh({ auditOne });
    expect(summary.refreshed).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(auditOne).not.toHaveBeenCalled();
  });

  it("continues after a per-repo unknown failure", async () => {
    watchRepo({ owner: "a", repo: "broken" });
    watchRepo({ owner: "a", repo: "ok" });
    const auditOne = vi.fn(async (entry) => {
      if (entry.fullName.endsWith("broken")) throw new Error("boom");
      return { totalScore: 80, maxScore: 100, grade: "B", findingCount: 5 };
    });
    const summary = await runWatchRefresh({ auditOne });
    expect(summary.failed).toBe(1);
    expect(summary.refreshed).toBe(1);
    expect(summary.stoppedEarly).toBe(false);
  });

  it("short-circuits + reports rate-limit on RateLimitError", async () => {
    watchRepo({ owner: "a", repo: "first" });
    watchRepo({ owner: "a", repo: "second" });
    const auditOne = vi.fn(async () => {
      throw new RateLimitError({
        resetAtSeconds: 1_790_000_000,
        unauthenticated: true,
      });
    });
    const events: RefreshProgress[] = [];
    const summary = await runWatchRefresh({
      auditOne,
      onProgress: (e) => events.push(e),
    });
    expect(summary.stoppedEarly).toBe(true);
    expect(summary.stopReason).toBe("rate-limit");
    expect(auditOne).toHaveBeenCalledTimes(1);
    expect(events.some((e) => e.kind === "rate-limit")).toBe(true);
  });

  it("respects an already-aborted signal", async () => {
    watchRepo({ owner: "a", repo: "b" });
    const controller = new AbortController();
    controller.abort();
    const auditOne = vi.fn();
    const summary = await runWatchRefresh({
      auditOne,
      signal: controller.signal,
    });
    expect(summary.stoppedEarly).toBe(true);
    expect(summary.stopReason).toBe("aborted");
    expect(auditOne).not.toHaveBeenCalled();
  });
});
