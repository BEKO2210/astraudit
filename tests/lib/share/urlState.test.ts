import { describe, expect, it } from "vitest";
import {
  formatShareHash,
  formatShareUrl,
  parseShareHash,
} from "../../../src/lib/share/urlState";

describe("parseShareHash", () => {
  it("parses #/audit/owner/repo", () => {
    expect(parseShareHash("#/audit/facebook/react")).toEqual({
      coords: { owner: "facebook", repo: "react" },
    });
  });

  it("returns null for unrelated hashes", () => {
    expect(parseShareHash("#findings")).toBeNull();
    expect(parseShareHash("#/foo/bar")).toBeNull();
    expect(parseShareHash("")).toBeNull();
    expect(parseShareHash(null)).toBeNull();
    expect(parseShareHash(undefined)).toBeNull();
  });

  it("returns null for malformed audit fragments", () => {
    expect(parseShareHash("#/audit/")).toBeNull();
    expect(parseShareHash("#/audit/just-owner")).toBeNull();
    expect(parseShareHash("#/audit/owner/repo with space")).toBeNull();
  });

  it("accepts URL-style trailing segments", () => {
    expect(
      parseShareHash("#/audit/facebook/react/tree/main"),
    ).toEqual({
      coords: { owner: "facebook", repo: "react" },
    });
  });
});

describe("formatShareHash", () => {
  it("builds the share fragment", () => {
    expect(formatShareHash({ owner: "vuejs", repo: "core" })).toBe(
      "#/audit/vuejs/core",
    );
  });

  it("round-trips through parseShareHash", () => {
    const coords = { owner: "denoland", repo: "deno" };
    const parsed = parseShareHash(formatShareHash(coords));
    expect(parsed?.coords).toEqual(coords);
  });
});

describe("formatShareUrl", () => {
  it("builds a fully-qualified URL when given an explicit base", () => {
    const url = formatShareUrl(
      { owner: "expressjs", repo: "express" },
      "https://example.test/astraudit/",
    );
    expect(url).toBe("https://example.test/astraudit/#/audit/expressjs/express");
  });

  it("preserves the path of the base URL", () => {
    const url = formatShareUrl(
      { owner: "lodash", repo: "lodash" },
      "https://beko2210.github.io/astraudit/",
    );
    expect(url).toBe(
      "https://beko2210.github.io/astraudit/#/audit/lodash/lodash",
    );
  });
});
