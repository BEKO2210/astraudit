import { describe, it, expect } from "vitest";
import {
  absoluteUrlForLocale,
  getLocaleFromPath,
  pathForLocale,
} from "../../../src/lib/i18n/path";

const BASE = "/astraudit/";

describe("getLocaleFromPath", () => {
  it("returns null for the canonical root path", () => {
    expect(getLocaleFromPath("/astraudit/", BASE)).toBeNull();
    expect(getLocaleFromPath("/astraudit", BASE)).toBeNull();
  });

  it("detects each supported locale prefix", () => {
    expect(getLocaleFromPath("/astraudit/en/", BASE)).toBe("en");
    expect(getLocaleFromPath("/astraudit/de/", BASE)).toBe("de");
    expect(getLocaleFromPath("/astraudit/ja/", BASE)).toBe("ja");
  });

  it("detects the locale even with trailing routes after it", () => {
    expect(getLocaleFromPath("/astraudit/de/something/extra", BASE)).toBe("de");
  });

  it("returns null for unknown segments (typo fallback)", () => {
    expect(getLocaleFromPath("/astraudit/xx/", BASE)).toBeNull();
    expect(getLocaleFromPath("/astraudit/fr/", BASE)).toBeNull();
  });

  it("tolerates a custom dev base of `/`", () => {
    expect(getLocaleFromPath("/de/", "/")).toBe("de");
    expect(getLocaleFromPath("/", "/")).toBeNull();
  });
});

describe("pathForLocale", () => {
  it("English maps to the un-prefixed canonical root", () => {
    expect(pathForLocale("en", "/astraudit/de/", BASE)).toBe("/astraudit/");
    expect(pathForLocale("en", "/astraudit/", BASE)).toBe("/astraudit/");
  });

  it("non-English locales get their own prefix segment", () => {
    expect(pathForLocale("de", "/astraudit/", BASE)).toBe("/astraudit/de/");
    expect(pathForLocale("ja", "/astraudit/de/", BASE)).toBe("/astraudit/ja/");
  });

  it("forceExplicitDefault emits /en/ for the English variant", () => {
    expect(
      pathForLocale("en", "/astraudit/", BASE, { forceExplicitDefault: true }),
    ).toBe("/astraudit/en/");
  });

  it("strips a pre-existing locale segment when switching", () => {
    expect(pathForLocale("ja", "/astraudit/de/", BASE)).toBe("/astraudit/ja/");
  });
});

describe("absoluteUrlForLocale", () => {
  it("composes origin + base + locale segment", () => {
    expect(
      absoluteUrlForLocale("de", "https://example.test", "/astraudit/", BASE),
    ).toBe("https://example.test/astraudit/de/");
    expect(
      absoluteUrlForLocale("en", "https://example.test", "/astraudit/de/", BASE),
    ).toBe("https://example.test/astraudit/");
    expect(
      absoluteUrlForLocale(
        "en",
        "https://example.test",
        "/astraudit/",
        BASE,
        { forceExplicitDefault: true },
      ),
    ).toBe("https://example.test/astraudit/en/");
  });
});
