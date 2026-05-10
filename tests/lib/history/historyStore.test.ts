import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockStorage {
  store = new Map<string, string>();
  getItem(k: string) {
    return this.store.has(k) ? (this.store.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(_i: number) {
    return null;
  }
}

let storage: MockStorage;

beforeEach(() => {
  storage = new MockStorage();
  vi.stubGlobal("window", { localStorage: storage });
  vi.stubGlobal("localStorage", storage);
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function record(
  m: typeof import("../../../src/lib/history/historyStore"),
  owner: string,
  repo: string,
  score = 80,
) {
  m.recordAudit({
    coords: { owner, repo },
    fullName: `${owner}/${repo}`,
    score,
    grade: score >= 80 ? "Very Strong" : "Good, but incomplete",
  });
}

describe("historyStore", () => {
  it("recordAudit creates a new entry", async () => {
    const m = await import("../../../src/lib/history/historyStore");
    record(m, "facebook", "react", 81);
    const list = m.listHistory();
    expect(list).toHaveLength(1);
    expect(list[0].fullName).toBe("facebook/react");
    expect(list[0].favorite).toBe(false);
  });

  it("recordAudit dedupes by lowercase owner/repo", async () => {
    const m = await import("../../../src/lib/history/historyStore");
    record(m, "Facebook", "React", 80);
    record(m, "facebook", "react", 85);
    expect(m.listHistory()).toHaveLength(1);
    expect(m.listHistory()[0].score).toBe(85);
  });

  it("recordAudit preserves favorite flag on update", async () => {
    const m = await import("../../../src/lib/history/historyStore");
    record(m, "vuejs", "core");
    m.toggleFavorite({ owner: "vuejs", repo: "core" });
    record(m, "vuejs", "core", 75);
    const list = m.listHistory();
    expect(list[0].favorite).toBe(true);
    expect(list[0].score).toBe(75);
  });

  it("toggleFavorite flips the flag", async () => {
    const m = await import("../../../src/lib/history/historyStore");
    record(m, "lodash", "lodash");
    m.toggleFavorite({ owner: "lodash", repo: "lodash" });
    expect(m.listFavorites()).toHaveLength(1);
    m.toggleFavorite({ owner: "lodash", repo: "lodash" });
    expect(m.listFavorites()).toHaveLength(0);
  });

  it("listFavorites only returns favorited entries", async () => {
    const m = await import("../../../src/lib/history/historyStore");
    record(m, "a", "b");
    record(m, "c", "d");
    m.toggleFavorite({ owner: "a", repo: "b" });
    expect(m.listFavorites()).toHaveLength(1);
    expect(m.listFavorites()[0].fullName).toBe("a/b");
  });

  it("listHistory orders favorites first then by recency", async () => {
    const m = await import("../../../src/lib/history/historyStore");
    record(m, "a", "older");
    record(m, "b", "middle");
    record(m, "c", "newest");
    m.toggleFavorite({ owner: "a", repo: "older" });
    const list = m.listHistory();
    expect(list[0].fullName).toBe("a/older"); // favorite floats up
    expect(list[1].fullName).toBe("c/newest"); // most recent next
  });

  it("removeEntry drops the entry", async () => {
    const m = await import("../../../src/lib/history/historyStore");
    record(m, "x", "y");
    record(m, "p", "q");
    m.removeEntry({ owner: "x", repo: "y" });
    expect(m.listHistory()).toHaveLength(1);
    expect(m.listHistory()[0].fullName).toBe("p/q");
  });

  it("clearAll wipes everything", async () => {
    const m = await import("../../../src/lib/history/historyStore");
    record(m, "x", "y");
    m.toggleFavorite({ owner: "x", repo: "y" });
    m.clearAll();
    expect(m.listHistory()).toHaveLength(0);
    expect(m.listFavorites()).toHaveLength(0);
  });

  it("getStats reports counts", async () => {
    const m = await import("../../../src/lib/history/historyStore");
    record(m, "a", "b");
    record(m, "c", "d");
    m.toggleFavorite({ owner: "a", repo: "b" });
    expect(m.getStats()).toEqual({ total: 2, favorites: 1 });
  });
});
