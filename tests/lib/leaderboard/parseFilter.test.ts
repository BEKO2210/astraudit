import { describe, expect, it } from "vitest";
import {
  parseLeaderboardFilter,
  serialiseLeaderboardFilter,
} from "../../../src/lib/leaderboard/parseFilter";

describe("parseLeaderboardFilter (M6.1)", () => {
  it("returns an empty filter for missing / empty input", () => {
    expect(parseLeaderboardFilter(null)).toEqual({});
    expect(parseLeaderboardFilter(undefined)).toEqual({});
    expect(parseLeaderboardFilter("")).toEqual({});
    expect(parseLeaderboardFilter("?")).toEqual({});
  });

  it("extracts language + topic + minStars + raw q", () => {
    const f = parseLeaderboardFilter(
      "?lang=TypeScript&topic=CLI&minStars=5000&q=stars:%3E10000",
    );
    expect(f.language).toBe("TypeScript");
    expect(f.topic).toBe("cli");
    expect(f.minStars).toBe(5000);
    expect(f.rawQuery).toBe("stars:>10000");
  });

  it("drops a non-numeric minStars silently", () => {
    expect(parseLeaderboardFilter("?minStars=ten")).toEqual({});
  });

  it("drops a negative minStars", () => {
    expect(parseLeaderboardFilter("?minStars=-1")).toEqual({});
  });

  it("accepts URLSearchParams directly", () => {
    const params = new URLSearchParams("lang=rust");
    expect(parseLeaderboardFilter(params)).toEqual({ language: "rust" });
  });

  it("ignores unknown keys without failing", () => {
    const f = parseLeaderboardFilter("?lang=go&theme=dark&secret=42");
    expect(f).toEqual({ language: "go" });
  });
});

describe("serialiseLeaderboardFilter", () => {
  it("returns null for an empty filter", () => {
    expect(serialiseLeaderboardFilter({})).toBeNull();
  });

  it("emits the canonical query string for a single field", () => {
    expect(serialiseLeaderboardFilter({ language: "rust" })).toBe("lang=rust");
  });

  it("round-trips through parseLeaderboardFilter", () => {
    const original = {
      language: "typescript",
      topic: "cli",
      minStars: 5000,
      rawQuery: "good-first-issues:>5",
    };
    const ser = serialiseLeaderboardFilter(original);
    expect(ser).not.toBeNull();
    expect(parseLeaderboardFilter(ser!)).toEqual({
      language: "typescript",
      topic: "cli",
      minStars: 5000,
      rawQuery: "good-first-issues:>5",
    });
  });
});
