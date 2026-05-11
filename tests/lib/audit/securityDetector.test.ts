import { describe, expect, it } from "vitest";
import { classifyFiles } from "../../../src/lib/audit/fileClassifier";
import { analyzeSecurity } from "../../../src/lib/audit/securityDetector";
import { makeTree } from "../../fixtures/builders";

function classify(paths: string[]) {
  return classifyFiles(makeTree(paths), []);
}

describe("analyzeSecurity", () => {
  it("detects LICENSE in canonical and lowercase forms", () => {
    expect(analyzeSecurity(classify(["LICENSE"])).hasLicense).toBe(true);
    expect(analyzeSecurity(classify(["license.md"])).hasLicense).toBe(true);
    expect(analyzeSecurity(classify(["LICENCE.txt"])).hasLicense).toBe(true);
    expect(analyzeSecurity(classify(["COPYING"])).hasLicense).toBe(true);
    expect(analyzeSecurity(classify(["src/index.ts"])).hasLicense).toBe(false);
  });

  it("detects SECURITY.md at root, .github/, docs/", () => {
    expect(analyzeSecurity(classify(["SECURITY.md"])).hasSecurityPolicy).toBe(true);
    expect(analyzeSecurity(classify([".github/SECURITY.md"])).hasSecurityPolicy).toBe(true);
    expect(analyzeSecurity(classify(["docs/security.md"])).hasSecurityPolicy).toBe(true);
    expect(analyzeSecurity(classify(["src/index.ts"])).hasSecurityPolicy).toBe(false);
  });

  it("detects CODEOWNERS variants", () => {
    expect(analyzeSecurity(classify(["CODEOWNERS"])).hasCodeowners).toBe(true);
    expect(analyzeSecurity(classify([".github/CODEOWNERS"])).hasCodeowners).toBe(true);
    expect(analyzeSecurity(classify(["docs/codeowners"])).hasCodeowners).toBe(true);
  });

  it("detects Dependabot config", () => {
    expect(analyzeSecurity(classify([".github/dependabot.yml"])).hasDependabot).toBe(true);
    expect(analyzeSecurity(classify([".github/dependabot.yaml"])).hasDependabot).toBe(true);
    expect(analyzeSecurity(classify([])).hasDependabot).toBe(false);
  });

  it("detects .env.example and similar templates", () => {
    expect(analyzeSecurity(classify([".env.example"])).hasEnvExample).toBe(true);
    expect(analyzeSecurity(classify([".env.sample"])).hasEnvExample).toBe(true);
    expect(analyzeSecurity(classify([".env.template"])).hasEnvExample).toBe(true);
    expect(analyzeSecurity(classify(["example.env"])).hasEnvExample).toBe(true);
  });

  it("flags committed .env outside test fixtures", () => {
    const sec = analyzeSecurity(classify([".env", ".env.example"]));
    expect(sec.hasCommittedEnv).toBe(true);
    expect(sec.committedEnvFiles).toContain(".env");
  });

  it("does NOT flag .env files inside test fixtures", () => {
    const sec = analyzeSecurity(
      classify([
        "tests/fixtures/.env",
        "examples/demo/.env.local",
        "docs/.env.production",
      ]),
    );
    expect(sec.hasCommittedEnv).toBe(false);
    expect(sec.committedEnvFiles).toEqual([]);
  });

  // Phase 7.0.3 — branch protection threads through the security
  // signals so downstream scoring + UI can pattern-match without
  // poking at the bundle directly. Default fallback when the caller
  // didn't pass a probe is the honest `unknown` shape (no penalty,
  // no credit — see scoreEngine + the new verdict states from 7.0.5).
  describe("branchProtection passthrough", () => {
    it("defaults to `unknown` when the caller didn't probe", () => {
      const sec = analyzeSecurity(classify([]));
      expect(sec.branchProtection.status).toBe("unknown");
    });

    it("threads through an `observed` probe without altering shape", () => {
      const sec = analyzeSecurity(classify([]), undefined, {
        status: "observed",
        branch: "main",
        requiredReviews: 2,
        requiredStatusChecks: true,
        enforceAdmins: true,
        requireLinearHistory: false,
        allowForcePushes: false,
        allowDeletions: false,
      });
      if (sec.branchProtection.status !== "observed")
        throw new Error("expected observed");
      expect(sec.branchProtection.branch).toBe("main");
      expect(sec.branchProtection.requiredReviews).toBe(2);
      expect(sec.branchProtection.requiredStatusChecks).toBe(true);
    });
  });
});
