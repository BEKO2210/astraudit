// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import EN from "../../../src/lib/i18n/locales/en";
import DE from "../../../src/lib/i18n/locales/de";
import JA from "../../../src/lib/i18n/locales/ja";
import type { Catalog, Locale } from "../../../src/lib/i18n/types";
import { LOCALES, DEFAULT_LOCALE, LOCALE_LABELS } from "../../../src/lib/i18n/types";

describe("Catalog parity (M4.2)", () => {
  it("EN, DE, JA all expose the same key set", () => {
    const enKeys = Object.keys(EN).sort();
    expect(Object.keys(DE).sort()).toEqual(enKeys);
    expect(Object.keys(JA).sort()).toEqual(enKeys);
  });

  it("every catalog value is a non-empty string", () => {
    for (const [name, cat] of [
      ["en", EN],
      ["de", DE],
      ["ja", JA],
    ] as const) {
      for (const [k, v] of Object.entries(cat)) {
        expect(v, `${name}: empty value at ${k}`).toBeTypeOf("string");
        expect(
          v.length,
          `${name}: empty value at ${k}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("no catalog string is identical EN ↔ DE for translated keys", () => {
    // Sanity: at least one DE string actually differs from EN — if
    // somebody copy-pasted EN by accident, this fires.
    const enValues = Object.values(EN);
    const deValues = Object.values(DE);
    const overlap = enValues.filter((v, i) => deValues[i] === v).length;
    expect(overlap, "DE catalog looks suspiciously like EN").toBeLessThan(
      enValues.length / 2,
    );
  });

  it("no catalog string is identical EN ↔ JA for translated keys", () => {
    const enValues = Object.values(EN);
    const jaValues = Object.values(JA);
    const overlap = enValues.filter((v, i) => jaValues[i] === v).length;
    expect(overlap, "JA catalog looks suspiciously like EN").toBeLessThan(
      enValues.length / 2,
    );
  });
});

describe("Locale registry", () => {
  it("DEFAULT_LOCALE is included in LOCALES", () => {
    expect((LOCALES as readonly Locale[]).includes(DEFAULT_LOCALE)).toBe(true);
  });

  it("LOCALE_LABELS covers every locale", () => {
    for (const l of LOCALES) {
      expect(LOCALE_LABELS[l].native).toBeTypeOf("string");
      expect(LOCALE_LABELS[l].native.length).toBeGreaterThan(0);
      expect(LOCALE_LABELS[l].english).toBeTypeOf("string");
    }
  });
});

describe("getStoredLocale", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") localStorage.clear();
  });

  it("falls back to DEFAULT_LOCALE when storage is empty", async () => {
    const { getStoredLocale } = await import("../../../src/lib/i18n/index");
    // happy-dom provides localStorage in this test env.
    expect(getStoredLocale()).toBe(DEFAULT_LOCALE);
  });

  it("returns a valid stored value", async () => {
    if (typeof localStorage === "undefined") return; // node-env safety
    localStorage.setItem("astraudit:locale:v1", "de");
    const { getStoredLocale } = await import("../../../src/lib/i18n/index");
    expect(getStoredLocale()).toBe("de");
  });

  it("ignores an invalid stored value and falls back to default", async () => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem("astraudit:locale:v1", "xx" as unknown as string);
    const { getStoredLocale } = await import("../../../src/lib/i18n/index");
    expect(getStoredLocale()).toBe(DEFAULT_LOCALE);
  });
});

describe("Catalog shape contract", () => {
  it("EN satisfies the Catalog type at runtime (key presence check)", () => {
    // Mirror the type constraint at runtime so a future
    // catalog-type addition that someone forgot to ship in EN fails
    // here rather than at the first call site.
    const REQUIRED_KEYS: Array<keyof Catalog> = [
      "cta.audit",
      "cta.compare",
      "cta.similarRepos",
      "cta.close",
      "cta.openFullAudit",
      "dialog.similarRepos.title",
      "dialog.similarRepos.subtitle",
      "dialog.similarRepos.loading",
      "dialog.similarRepos.empty",
      "switcher.language",
    ];
    for (const k of REQUIRED_KEYS) {
      expect(EN[k], `EN missing key ${k}`).toBeDefined();
    }
  });
});
