import { describe, expect, it } from "vitest";
import {
  parseRulePacksFromSearch,
  serialiseEnabledPacks,
} from "../../../../src/lib/audit/rulePacks/parseRules";
import {
  NO_PACKS,
  RULE_PACK_IDS,
  type RulePackId,
} from "../../../../src/lib/audit/rulePacks/types";

describe("parseRulePacksFromSearch (M5.1)", () => {
  it("returns the empty set for missing or empty input", () => {
    expect(parseRulePacksFromSearch(null)).toEqual(NO_PACKS);
    expect(parseRulePacksFromSearch(undefined)).toEqual(NO_PACKS);
    expect(parseRulePacksFromSearch("")).toEqual(NO_PACKS);
    expect(parseRulePacksFromSearch("?rules=")).toEqual(NO_PACKS);
  });

  it("accepts a single known pack id", () => {
    expect([...parseRulePacksFromSearch("?rules=a11y")]).toEqual(["a11y"]);
  });

  it("accepts multiple comma-separated ids", () => {
    const enabled = parseRulePacksFromSearch("?rules=a11y,i18n,ts");
    expect(enabled.has("a11y" as RulePackId)).toBe(true);
    expect(enabled.has("i18n" as RulePackId)).toBe(true);
    expect(enabled.has("ts" as RulePackId)).toBe(true);
    expect(enabled.size).toBe(3);
  });

  it("silently drops unknown / mistyped tokens", () => {
    const enabled = parseRulePacksFromSearch("?rules=a11y,wat,fnord,monorepo");
    expect([...enabled].sort()).toEqual(["a11y", "monorepo"]);
  });

  it("tolerates whitespace and case-insensitivity", () => {
    const enabled = parseRulePacksFromSearch("?rules=  A11Y , I18N ");
    expect([...enabled].sort()).toEqual(["a11y", "i18n"]);
  });

  it("accepts a URLSearchParams instance directly", () => {
    const enabled = parseRulePacksFromSearch(
      new URLSearchParams("rules=ts,monorepo"),
    );
    expect([...enabled].sort()).toEqual(["monorepo", "ts"]);
  });

  it("ignores other unrelated query params", () => {
    const enabled = parseRulePacksFromSearch(
      "?lang=de&rules=a11y&theme=dark",
    );
    expect([...enabled]).toEqual(["a11y"]);
  });
});

describe("serialiseEnabledPacks", () => {
  it("returns null for the empty set", () => {
    expect(serialiseEnabledPacks(NO_PACKS)).toBeNull();
  });

  it("serialises a single pack", () => {
    const set = new Set<RulePackId>(["i18n"]);
    expect(serialiseEnabledPacks(set)).toBe("i18n");
  });

  it("emits packs in canonical order regardless of insertion order", () => {
    const set = new Set<RulePackId>(["monorepo", "a11y", "ts"]);
    expect(serialiseEnabledPacks(set)).toBe("a11y,ts,monorepo");
  });

  it("round-trips through parseRulePacksFromSearch", () => {
    const original = new Set<RulePackId>(["a11y", "i18n", "ts", "monorepo"]);
    const ser = serialiseEnabledPacks(original);
    expect(ser).not.toBeNull();
    const parsed = parseRulePacksFromSearch(`?rules=${ser}`);
    expect([...parsed].sort()).toEqual([...RULE_PACK_IDS].sort());
  });
});
