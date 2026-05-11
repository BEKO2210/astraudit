import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeBundle } from "../../fixtures/builders";

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
  key(i: number) {
    return Array.from(this.store.keys())[i] ?? null;
  }
}

let storage: MockStorage;

beforeEach(() => {
  storage = new MockStorage();
  vi.stubGlobal("window", { localStorage: storage });
  vi.stubGlobal("localStorage", storage);
  vi.resetModules();
});

describe("auditCache", () => {
  it("round-trips a bundle", async () => {
    const cache = await import("../../../src/lib/cache/auditCache");
    const bundle = makeBundle({ paths: ["README.md"] });
    cache.writeBundle({ owner: "owner", repo: "demo" }, bundle);
    const back = cache.readBundle({ owner: "owner", repo: "demo" });
    expect(back?.metadata.fullName).toBe("owner/demo");
  });

  it("is case-insensitive on keys", async () => {
    const cache = await import("../../../src/lib/cache/auditCache");
    const bundle = makeBundle({
      paths: ["README.md"],
      metadata: { name: "Demo", fullName: "Owner/Demo" },
    });
    cache.writeBundle({ owner: "Owner", repo: "Demo" }, bundle);
    expect(cache.readBundle({ owner: "owner", repo: "demo" })).not.toBeNull();
    expect(cache.readBundle({ owner: "OWNER", repo: "DEMO" })).not.toBeNull();
  });

  it("returns null when the entry is older than the TTL", async () => {
    const cache = await import("../../../src/lib/cache/auditCache");
    const bundle = makeBundle({ paths: ["README.md"] });
    cache.writeBundle({ owner: "owner", repo: "demo" }, bundle);

    // Advance the cached timestamp past the TTL by rewriting the entry.
    const key = Array.from(storage.store.keys()).find((k) =>
      k.endsWith(":owner/demo"),
    );
    expect(key).toBeTruthy();
    const raw = storage.getItem(key!);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { cachedAt: string };
    parsed.cachedAt = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
    storage.setItem(key!, JSON.stringify(parsed));

    expect(cache.readBundle({ owner: "owner", repo: "demo" })).toBeNull();
  });

  it("clearAll wipes every cached entry and the index", async () => {
    const cache = await import("../../../src/lib/cache/auditCache");
    cache.writeBundle({ owner: "a", repo: "b" }, makeBundle());
    cache.writeBundle({ owner: "c", repo: "d" }, makeBundle());
    expect(cache.getStats().count).toBe(2);
    cache.clearAll();
    expect(cache.getStats().count).toBe(0);
    expect(storage.store.size).toBe(0);
  });
});

// Phase 6.28 — cache invalidation deep-dive. Locks the edge-case
// contracts the Re-audit flow + private-mode browsers rely on.
describe("auditCache — Phase 6.28 edge cases", () => {
  it("removeBundle drops the entry AND its index slot", async () => {
    const cache = await import("../../../src/lib/cache/auditCache");
    cache.writeBundle({ owner: "owner", repo: "demo" }, makeBundle());
    expect(cache.getStats().count).toBe(1);
    cache.removeBundle({ owner: "owner", repo: "demo" });
    expect(cache.readBundle({ owner: "owner", repo: "demo" })).toBeNull();
    expect(cache.getStats().count).toBe(0);
  });

  it("readBundle returns null for malformed JSON in localStorage", async () => {
    const cache = await import("../../../src/lib/cache/auditCache");
    cache.writeBundle({ owner: "owner", repo: "demo" }, makeBundle());
    const key = Array.from(storage.store.keys()).find((k) =>
      k.endsWith(":owner/demo"),
    )!;
    storage.setItem(key, "{ this is not valid JSON");
    expect(cache.readBundle({ owner: "owner", repo: "demo" })).toBeNull();
  });

  it("writeBundle silently no-ops when localStorage throws (private mode / quota)", async () => {
    const cache = await import("../../../src/lib/cache/auditCache");
    // Simulate a private-mode browser by making setItem throw and
    // verifying the call doesn't propagate the exception.
    const originalSet = storage.setItem.bind(storage);
    storage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(() => {
      cache.writeBundle({ owner: "owner", repo: "demo" }, makeBundle());
    }).not.toThrow();
    // Restore so other tests in this describe-block don't blow up.
    storage.setItem = originalSet;
    // Subsequent readBundle should return null because nothing actually
    // wrote.
    expect(cache.readBundle({ owner: "owner", repo: "demo" })).toBeNull();
  });

  it("readBundle returns null on a brand-new key (cold cache)", async () => {
    const cache = await import("../../../src/lib/cache/auditCache");
    expect(cache.readBundle({ owner: "fresh", repo: "miss" })).toBeNull();
  });

  it("overwriting the same key keeps exactly one entry", async () => {
    const cache = await import("../../../src/lib/cache/auditCache");
    cache.writeBundle({ owner: "owner", repo: "demo" }, makeBundle());
    cache.writeBundle(
      { owner: "owner", repo: "demo" },
      makeBundle({ paths: ["README.md", "package.json"] }),
    );
    expect(cache.getStats().count).toBe(1);
    const back = cache.readBundle({ owner: "owner", repo: "demo" });
    expect(back).not.toBeNull();
    // Most-recent write wins.
    expect(back!.tree.entries.length).toBeGreaterThan(0);
  });

  it("tolerates a missing localStorage entirely (server-side path)", async () => {
    // Drop the global stub for this case so isBrowser() returns false.
    vi.unstubAllGlobals();
    vi.resetModules();
    const cache = await import("../../../src/lib/cache/auditCache");
    expect(cache.readBundle({ owner: "x", repo: "y" })).toBeNull();
    expect(() => {
      cache.writeBundle({ owner: "x", repo: "y" }, makeBundle());
    }).not.toThrow();
    expect(cache.getStats().count).toBe(0);
    // Restore stubs for subsequent tests in the file.
    storage = new MockStorage();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("localStorage", storage);
  });
});
