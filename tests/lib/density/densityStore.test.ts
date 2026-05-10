/**
 * Tests for the Phase 2.8.9 density store.
 *
 * The store is the single source of truth for the comfortable / compact
 * choice. We assert:
 *   1. SSR safety — calling `loadDensity()` / `applyDensity()` without a
 *      DOM doesn't throw.
 *   2. Default is "comfortable" so existing layouts are unchanged.
 *   3. `saveDensity` → `loadDensity` round-trip is stable.
 *   4. `applyDensity("compact")` writes `data-density="compact"` to the
 *      document root; `applyDensity("comfortable")` removes it.
 *   5. Unknown / corrupted localStorage values fall back to comfortable.
 *   6. CSS contract — globals.css must scope every compact rule to
 *      `html[data-density="compact"]`. A regression here would silently
 *      break user-controlled spacing.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  applyDensity,
  DENSITY_STORAGE_KEY,
  loadDensity,
  saveDensity,
  toggleDensity,
} from "../../../src/lib/density/densityStore";

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

class FakeElement {
  attrs = new Map<string, string>();
  setAttribute(k: string, v: string) {
    this.attrs.set(k, v);
  }
  removeAttribute(k: string) {
    this.attrs.delete(k);
  }
  getAttribute(k: string) {
    return this.attrs.get(k) ?? null;
  }
}

describe("densityStore", () => {
  let storage: MemoryStorage;
  let html: FakeElement;

  beforeEach(() => {
    storage = new MemoryStorage();
    html = new FakeElement();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("document", { documentElement: html });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to comfortable when nothing is saved", () => {
    expect(loadDensity()).toBe("comfortable");
  });

  it("survives a round-trip through localStorage", () => {
    saveDensity("compact");
    expect(storage.getItem(DENSITY_STORAGE_KEY)).toBe("compact");
    expect(loadDensity()).toBe("compact");

    saveDensity("comfortable");
    expect(loadDensity()).toBe("comfortable");
  });

  it("falls back to comfortable when the stored value is unknown", () => {
    storage.setItem(DENSITY_STORAGE_KEY, "ultra-dense-2x");
    expect(loadDensity()).toBe("comfortable");
  });

  it("applyDensity('compact') sets data-density on <html>", () => {
    applyDensity("compact");
    expect(html.getAttribute("data-density")).toBe("compact");
  });

  it("applyDensity('comfortable') removes data-density (back to baseline)", () => {
    html.setAttribute("data-density", "compact");
    applyDensity("comfortable");
    expect(html.getAttribute("data-density")).toBeNull();
  });

  it("toggleDensity flips between the two modes", () => {
    expect(toggleDensity("comfortable")).toBe("compact");
    expect(toggleDensity("compact")).toBe("comfortable");
  });

  it("does not throw when window/document are absent (SSR guard)", () => {
    vi.unstubAllGlobals();
    expect(() => loadDensity()).not.toThrow();
    expect(() => saveDensity("compact")).not.toThrow();
    expect(() => applyDensity("compact")).not.toThrow();
    expect(loadDensity()).toBe("comfortable");
  });
});

describe("densityStore CSS contract (globals.css)", () => {
  const GLOBALS_CSS = readFileSync(
    resolve(__dirname, "..", "..", "..", "src/styles/globals.css"),
    "utf-8",
  );

  it("scopes every compact rule under html[data-density='compact']", () => {
    // Find the density block by its sentinel comment.
    const blockMatch = GLOBALS_CSS.match(
      /DENSITY MODES — Phase 2\.8\.9[\s\S]+?TOOLTIP PRIMITIVE/,
    );
    expect(blockMatch, "density block missing from globals.css").not.toBeNull();
    const block = blockMatch![0];

    // Every selector inside the block must start with html[data-density="compact"].
    const selectorLines = block
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.endsWith("{") && !line.startsWith("/*"));

    for (const line of selectorLines) {
      expect(
        line.startsWith('html[data-density="compact"]'),
        `Compact rule must be scoped to html[data-density="compact"]: ${line}`,
      ).toBe(true);
    }
  });

  it("never shrinks interactive height utilities (WCAG 2.5.8 guard)", () => {
    const blockMatch = GLOBALS_CSS.match(
      /DENSITY MODES — Phase 2\.8\.9[\s\S]+?TOOLTIP PRIMITIVE/,
    );
    expect(blockMatch).not.toBeNull();
    const block = blockMatch![0];
    // No `.h-6`, `.h-7`, `.h-8`, `min-height`, `min-h-*`, etc. inside the
    // density block — those are interactive target sizes.
    expect(block).not.toMatch(/\.\bh-\d/);
    expect(block).not.toMatch(/\bmin-h(eight)?\b/);
  });
});
