import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { __test } from "../../../src/lib/keyboard/useGlobalShortcuts";

// node env doesn't ship the DOM. Provide a minimal HTMLElement stub
// so `instanceof HTMLElement` works inside isEditableTarget.
class HTMLElementStub {
  tagName = "DIV";
  isContentEditable = false;
}

beforeAll(() => {
  vi.stubGlobal("HTMLElement", HTMLElementStub);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("useGlobalShortcuts internals", () => {
  it("maps every documented chord to a section id", () => {
    const map = __test.G_PREFIX_MAP;
    // Every value must be a known SectionNav id.
    const sections = new Set([
      "overview",
      "score",
      "story",
      "readme",
      "insights",
      "graph",
      "findings",
      "structure",
      "stack",
      "maintenance",
      "onboarding",
      "next",
    ]);
    for (const target of Object.values(map)) {
      expect(sections.has(target)).toBe(true);
    }
    expect(map.s).toBe("score");
    expect(map.f).toBe("findings");
    expect(map.i).toBe("insights");
    expect(map.g).toBe("graph");
  });

  it("isEditableTarget treats inputs / textarea / select / contenteditable as editable", () => {
    const make = (tag: string, editable = false) => {
      const el = new HTMLElementStub();
      el.tagName = tag.toUpperCase();
      el.isContentEditable = editable;
      return el as unknown as HTMLElement;
    };
    expect(__test.isEditableTarget(make("input"))).toBe(true);
    expect(__test.isEditableTarget(make("textarea"))).toBe(true);
    expect(__test.isEditableTarget(make("select"))).toBe(true);
    expect(__test.isEditableTarget(make("div", true))).toBe(true);
    expect(__test.isEditableTarget(make("div", false))).toBe(false);
    expect(__test.isEditableTarget(null)).toBe(false);
  });
});
