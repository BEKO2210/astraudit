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
