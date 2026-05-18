/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __test,
  bindingFromEvent,
  findConflict,
  formatBinding,
  getKeymap,
  matchesBinding,
  resetAllBindings,
  resetBinding,
  setBinding,
  type KeyBinding,
} from "../../../src/lib/keyboard/keymapStore";

beforeEach(() => resetAllBindings());
afterEach(() => resetAllBindings());

describe("getKeymap (defaults)", () => {
  it("returns the baked-in defaults when nothing is persisted", () => {
    const map = getKeymap();
    expect(map.palette.key.toLowerCase()).toBe("k");
    expect(map.palette.meta && map.palette.ctrl).toBe(true);
    expect(map.cheatSheet.key).toBe("?");
    expect(map.focusInput.key).toBe("/");
  });
});

describe("setBinding + resetBinding", () => {
  it("persists an override and surfaces it via getKeymap", () => {
    const next: KeyBinding = {
      key: "p",
      meta: false,
      ctrl: false,
      alt: true,
      shift: false,
    };
    setBinding("cheatSheet", next);
    expect(getKeymap().cheatSheet).toEqual(next);
  });

  it("resetBinding restores the default for a single action", () => {
    setBinding("cheatSheet", {
      key: "z",
      meta: false,
      ctrl: false,
      alt: false,
      shift: false,
    });
    resetBinding("cheatSheet");
    expect(getKeymap().cheatSheet).toEqual(__test.DEFAULT_BINDINGS.cheatSheet);
  });

  it("resetAllBindings clears every override", () => {
    setBinding("cheatSheet", {
      key: "z",
      meta: false,
      ctrl: false,
      alt: false,
      shift: false,
    });
    setBinding("focusInput", {
      key: "x",
      meta: false,
      ctrl: false,
      alt: false,
      shift: false,
    });
    resetAllBindings();
    expect(getKeymap()).toEqual(__test.DEFAULT_BINDINGS);
  });
});

describe("matchesBinding", () => {
  function evt(
    key: string,
    modifiers: Partial<{ meta: boolean; ctrl: boolean; alt: boolean; shift: boolean }> = {},
  ): KeyboardEvent {
    return new KeyboardEvent("keydown", {
      key,
      metaKey: !!modifiers.meta,
      ctrlKey: !!modifiers.ctrl,
      altKey: !!modifiers.alt,
      shiftKey: !!modifiers.shift,
    });
  }

  it("matches the palette default on either Cmd+K or Ctrl+K", () => {
    const palette = getKeymap().palette;
    expect(matchesBinding(evt("k", { meta: true }), palette)).toBe(true);
    expect(matchesBinding(evt("k", { ctrl: true }), palette)).toBe(true);
    expect(matchesBinding(evt("K", { ctrl: true }), palette)).toBe(true);
  });

  it("rejects palette match without any modifier", () => {
    expect(matchesBinding(evt("k"), getKeymap().palette)).toBe(false);
  });

  it("matches a no-modifier default exactly", () => {
    expect(matchesBinding(evt("?"), getKeymap().cheatSheet)).toBe(true);
    expect(matchesBinding(evt("?", { meta: true }), getKeymap().cheatSheet)).toBe(false);
  });

  it("respects strict alt + shift gating on a custom override", () => {
    const binding: KeyBinding = {
      key: "x",
      meta: false,
      ctrl: false,
      alt: true,
      shift: true,
    };
    expect(matchesBinding(evt("x", { alt: true, shift: true }), binding)).toBe(true);
    expect(matchesBinding(evt("x", { alt: true }), binding)).toBe(false);
  });
});

describe("bindingFromEvent", () => {
  function evt(
    key: string,
    modifiers: Partial<{ meta: boolean; ctrl: boolean; alt: boolean; shift: boolean }> = {},
  ): KeyboardEvent {
    return new KeyboardEvent("keydown", {
      key,
      metaKey: !!modifiers.meta,
      ctrlKey: !!modifiers.ctrl,
      altKey: !!modifiers.alt,
      shiftKey: !!modifiers.shift,
    });
  }

  it("captures the key + every modifier flag", () => {
    expect(
      bindingFromEvent(evt("z", { ctrl: true, shift: true })),
    ).toEqual({
      key: "z",
      meta: false,
      ctrl: true,
      alt: false,
      shift: true,
    });
  });

  it("rejects standalone modifier keys", () => {
    for (const key of ["Meta", "Control", "Alt", "Shift", "Escape", "Tab"]) {
      expect(bindingFromEvent(evt(key))).toBeNull();
    }
  });
});

describe("findConflict", () => {
  it("returns the conflicting action id when another binding matches", () => {
    setBinding("focusInput", {
      key: "?",
      meta: false,
      ctrl: false,
      alt: false,
      shift: false,
    });
    expect(findConflict(getKeymap().cheatSheet, "cheatSheet")).toBe("focusInput");
  });

  it("returns null when nothing else collides", () => {
    expect(findConflict(getKeymap().palette, "palette")).toBeNull();
  });
});

describe("formatBinding", () => {
  it("formats single keys uppercased", () => {
    expect(formatBinding(getKeymap().focusInput)).toBe("/");
    expect(formatBinding(getKeymap().palette)).toBe("Ctrl/⌘ + K");
  });

  it("includes alt + shift labels when set", () => {
    expect(
      formatBinding({
        key: "z",
        meta: false,
        ctrl: false,
        alt: true,
        shift: true,
      }),
    ).toBe("Alt + Shift + Z");
  });
});
