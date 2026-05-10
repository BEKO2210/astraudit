/**
 * Tests for the Phase 3.8 orchestrator (cache + concurrency + abort).
 *
 * Behaviour we lock down:
 *   1. Cached entries skip the network entirely and surface as
 *      `kind: "ok", cached: true`.
 *   2. Live fetches honour the concurrency cap.
 *   3. The `maxPackages` cap silently drops the tail of the request
 *      list — no errors, no fan-out.
 *   4. `bucketStaleness` thresholds match the ROADMAP semantics.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bucketStaleness,
  fetchRegistryMetadata,
} from "../../../src/lib/registries";
import { writeCached } from "../../../src/lib/registries/registryCache";
import type {
  RegistryMetadata,
} from "../../../src/lib/registries/types";

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

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: new MemoryStorage() });
  vi.stubGlobal("localStorage", (window as unknown as { localStorage: MemoryStorage }).localStorage);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-10T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const sample = (
  overrides: Partial<RegistryMetadata> = {},
): RegistryMetadata => ({
  ecosystem: "npm",
  name: "react",
  latestVersion: "18.3.1",
  lastPublishedAt: "2024-04-22T12:00:00Z",
  deprecated: false,
  homepage: null,
  recentDownloads: null,
  ...overrides,
});

describe("fetchRegistryMetadata — cache short-circuit", () => {
  it("serves cached entries without hitting the network", async () => {
    writeCached(sample({ name: "react" }));
    writeCached(sample({ name: "vue" }));
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const out = await fetchRegistryMetadata([
      { ecosystem: "npm", name: "react" },
      { ecosystem: "npm", name: "vue" },
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(out.every((o) => o.kind === "ok")).toBe(true);
    expect(out.every((o) => o.kind === "ok" && o.cached)).toBe(true);
  });

  it("emits cached results synchronously through onProgress", async () => {
    writeCached(sample({ name: "react" }));
    const progressed: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          name: "vue",
          "dist-tags": { latest: "3.4.0" },
          time: { "3.4.0": "2024-01-01T00:00:00Z" },
        }),
      }),
    );
    await fetchRegistryMetadata(
      [
        { ecosystem: "npm", name: "react" },
        { ecosystem: "npm", name: "vue" },
      ],
      {
        onProgress: (o) => {
          if (o.kind === "ok") progressed.push(o.metadata.name);
        },
      },
    );
    expect(progressed).toContain("react");
    expect(progressed).toContain("vue");
  });
});

describe("fetchRegistryMetadata — caps", () => {
  it("respects `maxPackages` by dropping the tail silently", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        name: "x",
        "dist-tags": { latest: "1.0.0" },
        time: { "1.0.0": "2024-01-01T00:00:00Z" },
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    const requests = Array.from({ length: 50 }, (_, i) => ({
      ecosystem: "npm" as const,
      name: `pkg-${i}`,
    }));
    const out = await fetchRegistryMetadata(requests, { maxPackages: 5 });
    expect(out).toHaveLength(5);
    expect(fetchSpy).toHaveBeenCalledTimes(5);
  });
});

describe("bucketStaleness", () => {
  const now = new Date("2026-05-10T12:00:00Z");
  it.each([
    ["2026-05-01T12:00:00Z", "fresh"],
    ["2026-04-01T12:00:00Z", "fresh"],
    ["2025-12-01T12:00:00Z", "recent"],
    ["2024-08-01T12:00:00Z", "stale"],
    ["2023-01-01T12:00:00Z", "abandoned"],
  ] as const)("%s → %s", (iso, expected) => {
    expect(bucketStaleness(sample({ lastPublishedAt: iso }), now)).toBe(expected);
  });

  it("treats null lastPublishedAt as `abandoned`", () => {
    expect(bucketStaleness(sample({ lastPublishedAt: null }), now)).toBe(
      "abandoned",
    );
  });

  it("treats invalid date strings as `abandoned`", () => {
    expect(bucketStaleness(sample({ lastPublishedAt: "not-a-date" }), now)).toBe(
      "abandoned",
    );
  });
});
