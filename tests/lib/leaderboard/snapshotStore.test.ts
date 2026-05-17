/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __test,
  capHistory,
  clearAllSnapshots,
  fingerprint,
  loadLatestSnapshot,
  loadSnapshotHistory,
  purgeExpired,
  saveSnapshot,
  type SnapshotRecord,
  type SnapshotRow,
} from "../../../src/lib/leaderboard/snapshotStore";

function makeRow(idx: number, overrides: Partial<SnapshotRow> = {}): SnapshotRow {
  return {
    fullName: `owner/repo-${idx}`,
    owner: "owner",
    name: `repo-${idx}`,
    htmlUrl: `https://github.com/owner/repo-${idx}`,
    description: null,
    stars: 1000 - idx,
    pushedAt: "2026-05-01T00:00:00Z",
    totalScore: 80 - idx,
    maxScore: 100,
    grade: "B",
    ...overrides,
  };
}

function makeRecord(
  idx: number,
  fp = "lang=ts",
  agoMs = 0,
): SnapshotRecord {
  return {
    id: `id-${idx}`,
    fingerprint: fp,
    savedAt: new Date(Date.now() - agoMs).toISOString(),
    rows: [makeRow(idx)],
  };
}

beforeEach(() => {
  clearAllSnapshots();
});
afterEach(() => {
  clearAllSnapshots();
});

describe("fingerprint", () => {
  it("returns a default key for the empty filter", () => {
    expect(fingerprint({})).toBe("__default__");
  });

  it("is stable for equivalent filters regardless of construction order", () => {
    const a = fingerprint({ language: "ts", topic: "cli" });
    const b = fingerprint({ topic: "cli", language: "ts" });
    expect(a).toBe(b);
  });

  it("distinguishes filters that differ in any field", () => {
    expect(fingerprint({ language: "ts" })).not.toBe(
      fingerprint({ language: "rust" }),
    );
  });
});

describe("purgeExpired", () => {
  it("drops records older than the TTL", () => {
    const fresh = makeRecord(0, "k", 1_000);
    const stale = makeRecord(1, "k", __test.TTL_MS + 1);
    const live = purgeExpired([fresh, stale]);
    expect(live.map((s) => s.id)).toEqual(["id-0"]);
  });

  it("drops records with an unparseable savedAt", () => {
    const bad = { ...makeRecord(0), savedAt: "not-a-date" };
    expect(purgeExpired([bad])).toEqual([]);
  });
});

describe("capHistory", () => {
  it("keeps the newest N per fingerprint", () => {
    const records: SnapshotRecord[] = [];
    for (let i = 0; i < 8; i++) {
      records.push(makeRecord(i, "fp-a", (8 - i) * 1000));
    }
    const kept = capHistory(records, 3, 100);
    expect(kept).toHaveLength(3);
    // Sorted oldest → newest after the cap.
    expect(kept[0]?.id).toBe("id-5");
    expect(kept[2]?.id).toBe("id-7");
  });

  it("applies a global cap across fingerprints", () => {
    const records: SnapshotRecord[] = [];
    for (let i = 0; i < 5; i++) records.push(makeRecord(i, "fp-a", (10 - i) * 1000));
    for (let i = 5; i < 10; i++) records.push(makeRecord(i, "fp-b", (10 - i) * 1000));
    const kept = capHistory(records, 5, 4);
    expect(kept).toHaveLength(4);
  });
});

describe("saveSnapshot + loadLatestSnapshot", () => {
  it("round-trips a single snapshot", () => {
    saveSnapshot({ language: "ts" }, [makeRow(0)]);
    const loaded = loadLatestSnapshot({ language: "ts" });
    expect(loaded?.rows).toHaveLength(1);
    expect(loaded?.fingerprint).toBe("lang=ts");
  });

  it("returns the newest snapshot when several exist for the same filter", () => {
    saveSnapshot({ language: "ts" }, [makeRow(0)]);
    saveSnapshot({ language: "ts" }, [makeRow(1), makeRow(2)]);
    const loaded = loadLatestSnapshot({ language: "ts" });
    expect(loaded?.rows).toHaveLength(2);
  });

  it("returns null when no snapshot matches the filter", () => {
    saveSnapshot({ language: "ts" }, [makeRow(0)]);
    expect(loadLatestSnapshot({ language: "rust" })).toBeNull();
  });
});

describe("loadSnapshotHistory", () => {
  it("returns matching snapshots oldest → newest", () => {
    saveSnapshot({ language: "ts" }, [makeRow(0)]);
    saveSnapshot({ language: "ts" }, [makeRow(1)]);
    saveSnapshot({ language: "ts" }, [makeRow(2)]);
    const history = loadSnapshotHistory({ language: "ts" });
    expect(history).toHaveLength(3);
    expect(history[0]?.rows[0]?.fullName).toBe("owner/repo-0");
    expect(history.at(-1)?.rows[0]?.fullName).toBe("owner/repo-2");
  });

  it("excludes snapshots for unrelated filters", () => {
    saveSnapshot({ language: "ts" }, [makeRow(0)]);
    saveSnapshot({ language: "rust" }, [makeRow(1)]);
    const history = loadSnapshotHistory({ language: "ts" });
    expect(history).toHaveLength(1);
  });
});
