/**
 * Tests for the Phase 3.8 registry cache.
 *
 * Behaviour we lock down:
 *   1. round-trip: write → read returns the metadata.
 *   2. Stale entries (cachedAt > 24 h ago) read as null *and* are
 *      evicted lazily.
 *   3. Cap eviction: writing past `MAX_ENTRIES` drops the oldest
 *      entry first.
 *   4. SSR safety: every function tolerates `localStorage` absence.
 *   5. `clearAllRegistryCache` removes every entry the index knows
 *      about, plus the index itself.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAllRegistryCache,
  readCached,
  writeCached,
} from "../../../src/lib/registries/registryCache";
import type { RegistryMetadata } from "../../../src/lib/registries/types";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null;
  }
}

const sampleMetadata = (overrides: Partial<RegistryMetadata> = {}): RegistryMetadata => ({
  ecosystem: "npm",
  name: "react",
  latestVersion: "18.3.1",
  lastPublishedAt: "2024-04-22T12:00:00Z",
  deprecated: false,
  homepage: "https://react.dev/",
  recentDownloads: null,
  ...overrides,
});

describe("registryCache", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("localStorage", storage);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("round-trips a write/read", () => {
    writeCached(sampleMetadata());
    const out = readCached("npm", "react");
    expect(out).not.toBeNull();
    expect(out!.latestVersion).toBe("18.3.1");
  });

  it("is case-insensitive on the package name", () => {
    writeCached(sampleMetadata({ name: "ReAcT" }));
    expect(readCached("npm", "react")).not.toBeNull();
    expect(readCached("npm", "REACT")).not.toBeNull();
  });

  it("returns null + evicts stale entries", () => {
    writeCached(sampleMetadata());
    // Advance well past the 24 h TTL.
    vi.setSystemTime(new Date("2026-05-12T12:00:00Z"));
    expect(readCached("npm", "react")).toBeNull();
    // The index is also pruned on read.
    const idx = JSON.parse(storage.getItem("astraudit:registry-index:v1") ?? "[]");
    expect(idx).toEqual([]);
  });

  it("returns null after the index passes the cap (oldest entries evicted)", () => {
    // The cache cap is 200; writing ~205 entries with monotonically
    // increasing cachedAt timestamps should evict the first 5.
    const baseT = Date.parse("2026-05-10T12:00:00Z");
    for (let i = 0; i < 205; i++) {
      vi.setSystemTime(new Date(baseT + i * 1000));
      writeCached(sampleMetadata({ name: `pkg-${i}` }));
    }
    // The very first entry should have been evicted.
    expect(readCached("npm", "pkg-0")).toBeNull();
    expect(readCached("npm", "pkg-204")).not.toBeNull();
  });

  it("handles SSR-mode (no localStorage) without throwing", () => {
    vi.unstubAllGlobals();
    expect(() => writeCached(sampleMetadata())).not.toThrow();
    expect(readCached("npm", "react")).toBeNull();
    expect(() => clearAllRegistryCache()).not.toThrow();
  });

  it("clearAllRegistryCache wipes every entry + the index", () => {
    writeCached(sampleMetadata({ name: "a" }));
    writeCached(sampleMetadata({ name: "b" }));
    writeCached(sampleMetadata({ ecosystem: "pypi", name: "django" }));
    clearAllRegistryCache();
    expect(readCached("npm", "a")).toBeNull();
    expect(readCached("npm", "b")).toBeNull();
    expect(readCached("pypi", "django")).toBeNull();
    expect(storage.getItem("astraudit:registry-index:v1")).toBeNull();
  });
});
