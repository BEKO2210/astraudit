/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __test,
  clearAllWatched,
  getWatched,
  isDueForRefresh,
  isWatched,
  listWatched,
  unwatchRepo,
  updateAfterCheck,
  watchRepo,
  type WatchedRepo,
} from "../../../src/lib/watch/watchStore";

const SNAPSHOT = {
  totalScore: 80,
  maxScore: 100,
  grade: "B",
  findingCount: 7,
};

beforeEach(() => {
  clearAllWatched();
});
afterEach(() => {
  clearAllWatched();
});

describe("watchRepo + isWatched + listWatched (M7.1)", () => {
  it("adds an entry that surfaces via isWatched and listWatched", () => {
    watchRepo({ owner: "facebook", repo: "react" });
    expect(isWatched({ owner: "facebook", repo: "react" })).toBe(true);
    const list = listWatched();
    expect(list).toHaveLength(1);
    expect(list[0]?.fullName).toBe("facebook/react");
  });

  it("is case-insensitive on owner/repo lookups", () => {
    watchRepo({ owner: "Facebook", repo: "REACT" });
    expect(isWatched({ owner: "facebook", repo: "react" })).toBe(true);
  });

  it("seeds the baseline snapshot on first add", () => {
    watchRepo({ owner: "vercel", repo: "next.js" }, SNAPSHOT);
    const got = getWatched({ owner: "vercel", repo: "next.js" });
    expect(got?.lastScore).toBe(80);
    expect(got?.lastGrade).toBe("B");
    expect(got?.lastFindingCount).toBe(7);
    expect(got?.lastCheckedAt).not.toBeNull();
  });

  it("re-adding the same repo refreshes the snapshot but preserves addedAt", () => {
    const first = watchRepo({ owner: "vue", repo: "core" }, SNAPSHOT);
    const second = watchRepo(
      { owner: "vue", repo: "core" },
      { ...SNAPSHOT, totalScore: 90, grade: "A" },
    );
    expect(second.addedAt).toBe(first.addedAt);
    expect(second.lastScore).toBe(90);
    expect(second.lastGrade).toBe("A");
  });

  it("defaults intervalHours to weekly when not provided", () => {
    const entry = watchRepo({ owner: "rust-lang", repo: "rust" });
    expect(entry.intervalHours).toBe(__test.DEFAULT_INTERVAL_HOURS);
  });

  it("respects an explicit intervalHours override", () => {
    const entry = watchRepo(
      { owner: "denoland", repo: "deno" },
      undefined,
      { intervalHours: 6 },
    );
    expect(entry.intervalHours).toBe(6);
  });

  it("caps the list at MAX_WATCHED (oldest by addedAt evicted)", () => {
    for (let i = 0; i < __test.MAX_WATCHED + 5; i++) {
      watchRepo({ owner: "owner", repo: `repo-${i}` });
    }
    expect(listWatched()).toHaveLength(__test.MAX_WATCHED);
    // The newest survives; the oldest (repo-0) was evicted.
    expect(isWatched({ owner: "owner", repo: "repo-0" })).toBe(false);
    expect(
      isWatched({ owner: "owner", repo: `repo-${__test.MAX_WATCHED + 4}` }),
    ).toBe(true);
  });
});

describe("unwatchRepo", () => {
  it("removes a previously-watched entry", () => {
    watchRepo({ owner: "a", repo: "b" });
    unwatchRepo({ owner: "a", repo: "b" });
    expect(isWatched({ owner: "a", repo: "b" })).toBe(false);
  });

  it("is a no-op when the entry was never added", () => {
    unwatchRepo({ owner: "a", repo: "b" });
    expect(listWatched()).toEqual([]);
  });

  it("is case-insensitive", () => {
    watchRepo({ owner: "Foo", repo: "Bar" });
    unwatchRepo({ owner: "foo", repo: "bar" });
    expect(isWatched({ owner: "foo", repo: "bar" })).toBe(false);
  });
});

describe("updateAfterCheck", () => {
  it("refreshes lastScore / lastGrade / lastFindingCount + bumps lastCheckedAt", () => {
    watchRepo({ owner: "a", repo: "b" }, SNAPSHOT);
    updateAfterCheck(
      { owner: "a", repo: "b" },
      { ...SNAPSHOT, totalScore: 95, grade: "A", findingCount: 1 },
    );
    const entry = getWatched({ owner: "a", repo: "b" });
    expect(entry?.lastScore).toBe(95);
    expect(entry?.lastGrade).toBe("A");
    expect(entry?.lastFindingCount).toBe(1);
  });

  it("is a no-op when the repo is no longer watched", () => {
    updateAfterCheck({ owner: "a", repo: "b" }, SNAPSHOT);
    expect(listWatched()).toEqual([]);
  });
});

describe("isDueForRefresh", () => {
  function fixture(
    overrides: Partial<WatchedRepo> = {},
  ): WatchedRepo {
    return {
      owner: "a",
      repo: "b",
      fullName: "a/b",
      addedAt: new Date(0).toISOString(),
      lastCheckedAt: new Date(0).toISOString(),
      lastScore: 80,
      lastMaxScore: 100,
      lastGrade: "B",
      lastFindingCount: 5,
      intervalHours: 1,
      ...overrides,
    };
  }

  it("is true when never checked", () => {
    expect(isDueForRefresh(fixture({ lastCheckedAt: null }))).toBe(true);
  });

  it("is true when the interval has elapsed", () => {
    const checkedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(isDueForRefresh(fixture({ lastCheckedAt: checkedAt, intervalHours: 1 }))).toBe(
      true,
    );
  });

  it("is false while inside the interval window", () => {
    const checkedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(isDueForRefresh(fixture({ lastCheckedAt: checkedAt, intervalHours: 1 }))).toBe(
      false,
    );
  });

  it("treats an unparseable lastCheckedAt as `due`", () => {
    expect(isDueForRefresh(fixture({ lastCheckedAt: "bogus" }))).toBe(true);
  });
});
