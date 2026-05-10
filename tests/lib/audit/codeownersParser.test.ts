/**
 * Tests for the Phase 3.3 CODEOWNERS parser + glob coverage.
 *
 * Contract:
 *   1. Each rule line splits into pattern + owners[]; owner kind is
 *      classified (user / team / email / role / unknown).
 *   2. Comments (full-line and trailing) are stripped.
 *   3. Blank lines are skipped.
 *   4. GitLab section headers `[Name]` / `[Name][5]` / `^[Name]` are
 *      skipped and counted in `gitlabSectionCount` so the parser
 *      doesn't fail on hybrid configs.
 *   5. Owner aggregation deduplicates by raw token, sorts
 *      alphabetically, and identifies the most-frequent owner.
 *   6. `hasFallback` flips when `*`, `**`, or `/*` is one of the
 *      patterns.
 *   7. Glob matcher honours the documented CODEOWNERS subset:
 *      `*.js` matches basenames anywhere, `/docs/*` is anchored,
 *      `**` crosses directories, trailing `/` matches the dir tree.
 *   8. `computeCoverage` implements GitHub's last-match-wins
 *      precedence and treats empty-owner rules as explicit
 *      unassignments.
 *   9. `ownershipShape` returns the expected bucket for the
 *      published thresholds.
 */

import { describe, expect, it } from "vitest";
import {
  computeCoverage,
  ownershipShape,
  parseCodeowners,
} from "../../../src/lib/audit/codeownersParser";

describe("parseCodeowners — happy path", () => {
  it("parses a typical multi-rule CODEOWNERS file", () => {
    const file = [
      "# Default owners for everything",
      "*       @octocat",
      "",
      "# Specific paths",
      "/docs/  @org/docs-team",
      "*.js    @octocat @hubot   # JS still goes through the maintainers",
      "/api/internal/  user@example.com",
    ].join("\n");

    const out = parseCodeowners(file);
    expect(out).not.toBeNull();
    expect(out!.rules).toHaveLength(4);
    expect(out!.rules[0].pattern).toBe("*");
    expect(out!.rules[0].owners[0].raw).toBe("@octocat");
    expect(out!.rules[1].pattern).toBe("/docs/");
    expect(out!.rules[1].owners[0]).toMatchObject({
      raw: "@org/docs-team",
      kind: "team",
    });
    expect(out!.rules[2].pattern).toBe("*.js");
    expect(out!.rules[2].owners.map((o) => o.raw)).toEqual([
      "@octocat",
      "@hubot",
    ]);
    expect(out!.rules[3].owners[0]).toMatchObject({
      raw: "user@example.com",
      kind: "email",
    });
  });

  it("classifies every owner kind", () => {
    const file = [
      "*           @user1",
      "/teams/     @org/devs",
      "/legacy/    legacy@corp.com",
      "/role/      @@developer",
      "/weird/     someoneStrange?", // unknown shape
    ].join("\n");

    const out = parseCodeowners(file);
    expect(out).not.toBeNull();
    expect(out!.ownerCounts).toMatchObject({
      user: 1,
      team: 1,
      email: 1,
      role: 1,
      unknown: 1,
    });
  });

  it("flags `hasFallback` when the file has `*`, `**`, or `/*`", () => {
    const a = parseCodeowners("*    @org/team");
    expect(a!.hasFallback).toBe(true);
    const b = parseCodeowners("**    @org/team");
    expect(b!.hasFallback).toBe(true);
    const c = parseCodeowners("/*    @org/team");
    expect(c!.hasFallback).toBe(true);
    const d = parseCodeowners("*.js  @org/team");
    expect(d!.hasFallback).toBe(false);
  });

  it("identifies the most-frequent owner", () => {
    const file = [
      "*         @octocat",
      "*.ts      @octocat",
      "/docs/    @doc-team",
    ].join("\n");
    const out = parseCodeowners(file);
    expect(out!.topOwner?.raw).toBe("@octocat");
  });

  it("counts GitLab section headers but doesn't treat them as rules", () => {
    const file = [
      "[Frontend][2]",
      "/web/     @web-team",
      "^[Optional]",
      "/docs/    @doc-team",
    ].join("\n");
    const out = parseCodeowners(file);
    expect(out).not.toBeNull();
    expect(out!.gitlabSectionCount).toBe(2);
    expect(out!.rules).toHaveLength(2);
  });

  it("strips inline comments", () => {
    const out = parseCodeowners("*.go  @go-team   # Reviewed by Go folks");
    expect(out!.rules[0].owners.map((o) => o.raw)).toEqual(["@go-team"]);
  });

  it("dedupes the owner list and sorts it alphabetically", () => {
    const file = [
      "*         @bob @alice",
      "*.ts      @alice",
      "/docs/    @bob",
    ].join("\n");
    const out = parseCodeowners(file);
    expect(out!.owners.map((o) => o.raw)).toEqual(["@alice", "@bob"]);
  });

  it("returns null on empty / null input", () => {
    expect(parseCodeowners("")).toBeNull();
    expect(parseCodeowners("   \n  \n")).toBeNull();
    expect(parseCodeowners(null)).toBeNull();
    expect(parseCodeowners(undefined)).toBeNull();
  });
});

describe("computeCoverage — glob matching", () => {
  it("`*.js` (no slash) matches any depth", () => {
    const c = parseCodeowners("*.js   @js-team")!;
    computeCoverage(c, ["index.js", "src/lib/util.js", "test/fixtures/data.json"]);
    expect(c.coveragePercent).toBeCloseTo(66.7, 1);
    expect(c.blobsConsidered).toBe(3);
  });

  it("`/docs/` matches everything under the root docs/ tree", () => {
    const c = parseCodeowners("/docs/   @docs")!;
    computeCoverage(c, [
      "docs/index.md",
      "docs/api/intro.md",
      "src/index.ts",
      "test/foo.test.ts",
    ]);
    expect(c.coveragePercent).toBeCloseTo(50, 1);
  });

  it("`/build/logs/*` is anchored to root and only matches direct children", () => {
    const c = parseCodeowners("/build/logs/*   @ops")!;
    computeCoverage(c, [
      "build/logs/error.log",
      "build/logs/sub/extra.log",
      "build/output.txt",
    ]);
    // `*` does NOT cross slashes, so the nested `sub/extra.log` is not
    // covered. `build/logs/error.log` is. `build/output.txt` is not.
    expect(c.coveragePercent).toBeCloseTo(33.3, 1);
  });

  it("`apps/**/*.ts` matches any TS file under apps/ at any depth", () => {
    const c = parseCodeowners("apps/**/*.ts   @app-team")!;
    computeCoverage(c, [
      "apps/web/index.ts",
      "apps/api/v1/handler.ts",
      "apps/web/index.tsx",
    ]);
    // .tsx isn't .ts, so 2/3.
    expect(c.coveragePercent).toBeCloseTo(66.7, 1);
  });

  it("implements GitHub's last-match-wins precedence", () => {
    // The first rule grants ownership to @general; the later rule
    // explicitly unassigns docs/ by giving it no owner. Coverage
    // should NOT count docs/ files as covered.
    const file = [
      "*         @general",
      "/docs/", // explicit unassign — no owner
    ].join("\n");
    const c = parseCodeowners(file)!;
    computeCoverage(c, ["src/index.ts", "docs/index.md"]);
    expect(c.coveragePercent).toBeCloseTo(50, 1);
  });

  it("returns 0% when there are no blobs", () => {
    const c = parseCodeowners("*   @team")!;
    computeCoverage(c, []);
    expect(c.coveragePercent).toBe(0);
    expect(c.blobsConsidered).toBe(0);
  });
});

describe("ownershipShape", () => {
  it.each([
    [[], "empty"],
    [["@a"], "single-owner"],
    [["@a", "@b"], "narrow"],
    [["@a", "@b", "@c"], "narrow"],
    [["@a", "@b", "@c", "@d"], "balanced"],
    [["@a", "@b", "@c", "@d", "@e", "@f", "@g", "@h", "@i"], "balanced"],
    [
      ["@a", "@b", "@c", "@d", "@e", "@f", "@g", "@h", "@i", "@j"],
      "broad",
    ],
  ])("%j → %s", (owners, expected) => {
    if (owners.length === 0) {
      expect(ownershipShape({
        rules: [],
        owners: [],
        ownerCounts: { user: 0, team: 0, email: 0, role: 0, unknown: 0 },
        gitlabSectionCount: 0,
        hasFallback: false,
        topOwner: null,
        coveragePercent: null,
        blobsConsidered: 0,
      })).toBe(expected);
      return;
    }
    const file = owners.map((o, i) => `/dir${i}/   ${o}`).join("\n");
    const parsed = parseCodeowners(file)!;
    expect(ownershipShape(parsed)).toBe(expected);
  });
});
