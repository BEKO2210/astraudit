import { describe, expect, it } from "vitest";
import {
  findingElementId,
  formatCompareHash,
  formatShareHash,
  formatShareUrl,
  parseShareHash,
} from "../../../src/lib/share/urlState";

describe("parseShareHash — single audit", () => {
  it("parses #/audit/owner/repo", () => {
    expect(parseShareHash("#/audit/facebook/react")).toEqual({
      kind: "audit",
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
    expect(parseShareHash("#/audit/facebook/react/tree/main")).toEqual({
      kind: "audit",
      coords: { owner: "facebook", repo: "react" },
    });
  });
});

describe("parseShareHash — compare", () => {
  it("parses #/compare/A/B+C/D", () => {
    expect(parseShareHash("#/compare/facebook/react+vuejs/core")).toEqual({
      kind: "compare",
      left: { owner: "facebook", repo: "react" },
      right: { owner: "vuejs", repo: "core" },
    });
  });

  it("rejects compare without separator", () => {
    expect(parseShareHash("#/compare/foo/bar")).toBeNull();
  });

  it("rejects compare with missing side", () => {
    expect(parseShareHash("#/compare/+vuejs/core")).toBeNull();
    expect(parseShareHash("#/compare/facebook/react+")).toBeNull();
  });

  it("rejects compare with malformed slugs", () => {
    expect(parseShareHash("#/compare/foo with space/bar+vuejs/core")).toBeNull();
  });
});

describe("formatShareHash / formatCompareHash", () => {
  it("builds the audit fragment", () => {
    expect(formatShareHash({ owner: "vuejs", repo: "core" })).toBe(
      "#/audit/vuejs/core",
    );
  });

  it("builds the compare fragment", () => {
    expect(
      formatCompareHash(
        { owner: "facebook", repo: "react" },
        { owner: "vuejs", repo: "core" },
      ),
    ).toBe("#/compare/facebook/react+vuejs/core");
  });

  it("round-trips through parseShareHash for both kinds", () => {
    const audit = formatShareHash({ owner: "denoland", repo: "deno" });
    expect(parseShareHash(audit)).toEqual({
      kind: "audit",
      coords: { owner: "denoland", repo: "deno" },
    });

    const compare = formatCompareHash(
      { owner: "expressjs", repo: "express" },
      { owner: "fastify", repo: "fastify" },
    );
    expect(parseShareHash(compare)).toEqual({
      kind: "compare",
      left: { owner: "expressjs", repo: "express" },
      right: { owner: "fastify", repo: "fastify" },
    });
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

describe("M4.4 deep-link focus state", () => {
  it("parses `?focus=<id>` from an audit hash", () => {
    const res = parseShareHash("#/audit/facebook/react?focus=sec-no-license");
    expect(res).toEqual({
      kind: "audit",
      coords: { owner: "facebook", repo: "react" },
      focus: "sec-no-license",
    });
  });

  it("omits the focus field when not present", () => {
    const res = parseShareHash("#/audit/facebook/react");
    expect(res).toEqual({
      kind: "audit",
      coords: { owner: "facebook", repo: "react" },
    });
  });

  it("URL-decodes the focus token (so colons / spaces survive)", () => {
    const res = parseShareHash(
      "#/audit/facebook/react?focus=dep%3Aoutdated%20react",
    );
    expect(res && res.kind === "audit" ? res.focus : null).toBe(
      "dep:outdated react",
    );
  });

  it("ignores unrelated query keys after the focus", () => {
    const res = parseShareHash(
      "#/audit/facebook/react?focus=sec-x&utm_source=tweet",
    );
    expect(res && res.kind === "audit" ? res.focus : null).toBe("sec-x");
  });

  it("formats an audit hash with focus when provided", () => {
    const hash = formatShareHash(
      { owner: "facebook", repo: "react" },
      { focus: "sec-no-license" },
    );
    expect(hash).toBe("#/audit/facebook/react?focus=sec-no-license");
  });

  it("URL-encodes the focus token when formatting", () => {
    const hash = formatShareHash(
      { owner: "facebook", repo: "react" },
      { focus: "dep:outdated react" },
    );
    expect(hash).toBe(
      "#/audit/facebook/react?focus=dep%3Aoutdated%20react",
    );
  });

  it("falls back to no-focus form when focus is null/empty", () => {
    expect(
      formatShareHash({ owner: "f", repo: "r" }, { focus: null }),
    ).toBe("#/audit/f/r");
    expect(
      formatShareHash({ owner: "f", repo: "r" }, { focus: "" }),
    ).toBe("#/audit/f/r");
  });

  it("round-trips through format → parse", () => {
    const coords = { owner: "facebook", repo: "react" };
    const focus = "sec-no-license";
    const hash = formatShareHash(coords, { focus });
    const parsed = parseShareHash(hash);
    expect(parsed).toEqual({ kind: "audit", coords, focus });
  });

  it("formatShareUrl honours focus", () => {
    const url = formatShareUrl(
      { owner: "lodash", repo: "lodash" },
      "https://beko2210.github.io/astraudit/",
      { focus: "doc-no-readme" },
    );
    expect(url).toBe(
      "https://beko2210.github.io/astraudit/#/audit/lodash/lodash?focus=doc-no-readme",
    );
  });

  it("findingElementId is stable and predictable", () => {
    expect(findingElementId("sec-no-license")).toBe(
      "finding-sec-no-license",
    );
  });
});
