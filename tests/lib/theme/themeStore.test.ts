import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockStorage {
  private store = new Map<string, string>();
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

interface MockDocumentElement {
  attrs: Map<string, string>;
  setAttribute(k: string, v: string): void;
  removeAttribute(k: string): void;
  getAttribute(k: string): string | null;
  hasAttribute(k: string): boolean;
}

function makeMockDocument() {
  const el: MockDocumentElement = {
    attrs: new Map<string, string>(),
    setAttribute(k: string, v: string) {
      this.attrs.set(k, v);
    },
    removeAttribute(k: string) {
      this.attrs.delete(k);
    },
    getAttribute(k: string) {
      return this.attrs.get(k) ?? null;
    },
    hasAttribute(k: string) {
      return this.attrs.has(k);
    },
  };
  return { documentElement: el };
}

let storage: MockStorage;
let mockDoc: ReturnType<typeof makeMockDocument>;
let prefersLight = false;

beforeEach(() => {
  storage = new MockStorage();
  mockDoc = makeMockDocument();
  prefersLight = false;
  vi.stubGlobal("window", {
    localStorage: storage,
    matchMedia: (query: string) => ({
      matches: query.includes("light") ? prefersLight : !prefersLight,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("document", mockDoc);
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("themeStore", () => {
  it("loadTheme defaults to 'system' when storage is empty", async () => {
    const m = await import("../../../src/lib/theme/themeStore");
    expect(m.loadTheme()).toBe("system");
  });

  it("saveTheme + loadTheme round-trip", async () => {
    const m = await import("../../../src/lib/theme/themeStore");
    m.saveTheme("light");
    expect(m.loadTheme()).toBe("light");
    m.saveTheme("dark");
    expect(m.loadTheme()).toBe("dark");
    m.saveTheme("system");
    expect(m.loadTheme()).toBe("system");
  });

  it("ignores garbage values in storage", async () => {
    storage.setItem("astraudit:theme:v1", "neon");
    const m = await import("../../../src/lib/theme/themeStore");
    expect(m.loadTheme()).toBe("system");
  });

  it("resolveTheme honours OS preference for 'system'", async () => {
    const m = await import("../../../src/lib/theme/themeStore");
    prefersLight = true;
    expect(m.resolveTheme("system")).toBe("light");
    prefersLight = false;
    expect(m.resolveTheme("system")).toBe("dark");
  });

  it("resolveTheme returns the explicit choice for 'dark' / 'light'", async () => {
    const m = await import("../../../src/lib/theme/themeStore");
    expect(m.resolveTheme("dark")).toBe("dark");
    expect(m.resolveTheme("light")).toBe("light");
  });

  it("applyTheme sets data-theme=light only on light", async () => {
    const m = await import("../../../src/lib/theme/themeStore");
    m.applyTheme("light");
    expect(mockDoc.documentElement.getAttribute("data-theme")).toBe("light");
    m.applyTheme("dark");
    expect(mockDoc.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("applyTheme follows OS preference for 'system'", async () => {
    const m = await import("../../../src/lib/theme/themeStore");
    prefersLight = true;
    m.applyTheme("system");
    expect(mockDoc.documentElement.getAttribute("data-theme")).toBe("light");
    prefersLight = false;
    m.applyTheme("system");
    expect(mockDoc.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("cycleTheme cycles dark -> light -> system -> dark", async () => {
    const m = await import("../../../src/lib/theme/themeStore");
    expect(m.cycleTheme("dark")).toBe("light");
    expect(m.cycleTheme("light")).toBe("system");
    expect(m.cycleTheme("system")).toBe("dark");
  });
});
