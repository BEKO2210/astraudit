/**
 * Phase 7.x — honesty contract. We told users about
 * github.com/expressjs/express that CONTRIBUTING.md was missing
 * when in fact it's inherited from `expressjs/.github`. About
 * github.com/django/django we said the same about CONTRIBUTING when
 * the file is actually `CONTRIBUTING.rst` (Python convention, not
 * Markdown). This file locks the regressions:
 *
 *  1. The CONTRIBUTING / SECURITY / Code-of-Conduct detectors
 *     recognise every spelling GitHub itself recognises
 *     (`.md` / `.markdown` / `.rst` / `.txt` / no-extension, in
 *     root / .github / docs).
 *  2. The riskEngine's "No contributing guide detected" finding
 *     reads `ctx.dx.hasContributingGuide` (which already includes
 *     org-fallback) rather than re-doing its own file-name match
 *     and missing org-fallback.
 */

import { describe, expect, it } from "vitest";
import { classifyFiles } from "../../../src/lib/audit/fileClassifier";
import { analyzeDx } from "../../../src/lib/audit/dxDetector";
import { analyzeReadme } from "../../../src/lib/audit/documentationDetector";
import { analyzeDependencies } from "../../../src/lib/audit/dependencyDetector";
import { analyzeSecurity } from "../../../src/lib/audit/securityDetector";
import { makeBundle } from "../../fixtures/builders";
import { runAudit } from "../../../src/lib/audit/auditEngine";

function dxFor(paths: string[]) {
  const bundle = makeBundle({ paths });
  const classified = classifyFiles(bundle.tree, bundle.importantFiles);
  const readme = analyzeReadme(bundle.readme);
  const deps = analyzeDependencies(classified);
  return analyzeDx(classified, readme, deps, undefined);
}

function secFor(paths: string[]) {
  const bundle = makeBundle({ paths });
  const classified = classifyFiles(bundle.tree, bundle.importantFiles);
  return analyzeSecurity(classified, undefined);
}

describe("Honesty contract — CONTRIBUTING recognition", () => {
  it("accepts CONTRIBUTING.md at the root", () => {
    expect(dxFor(["CONTRIBUTING.md"]).hasContributingGuide).toBe(true);
  });
  it("accepts CONTRIBUTING.rst (Python convention — django/django)", () => {
    expect(dxFor(["CONTRIBUTING.rst"]).hasContributingGuide).toBe(true);
  });
  it("accepts CONTRIBUTING.txt", () => {
    expect(dxFor(["CONTRIBUTING.txt"]).hasContributingGuide).toBe(true);
  });
  it("accepts a bare CONTRIBUTING file with no extension", () => {
    expect(dxFor(["CONTRIBUTING"]).hasContributingGuide).toBe(true);
  });
  it("accepts .github/CONTRIBUTING.md", () => {
    expect(dxFor([".github/CONTRIBUTING.md"]).hasContributingGuide).toBe(true);
  });
  it("accepts .github/CONTRIBUTING.rst", () => {
    expect(dxFor([".github/CONTRIBUTING.rst"]).hasContributingGuide).toBe(true);
  });
  it("accepts docs/CONTRIBUTING.md", () => {
    expect(dxFor(["docs/CONTRIBUTING.md"]).hasContributingGuide).toBe(true);
  });
  it("returns false when nothing matches", () => {
    expect(dxFor(["README.md", "package.json"]).hasContributingGuide).toBe(
      false,
    );
  });
  it("returns true when org-fallback content is present (expressjs/.github case)", () => {
    const bundle = makeBundle({ paths: ["README.md", "LICENSE"] });
    const classified = classifyFiles(bundle.tree, bundle.importantFiles);
    const readme = analyzeReadme(bundle.readme);
    const deps = analyzeDependencies(classified);
    const dx = analyzeDx(classified, readme, deps, {
      owner: "expressjs",
      hasOrgRepo: true,
      securityPolicyPath: "SECURITY.md",
      securityPolicyContent: "x",
      codeOfConductPath: "CODE_OF_CONDUCT.md",
      codeOfConductContent: "x",
      contributingPath: "CONTRIBUTING.md",
      contributingContent: "x",
    });
    expect(dx.hasContributingGuide).toBe(true);
    expect(dx.contributingGuideSource).toBe("org-fallback");
  });
});

describe("Honesty contract — Code of Conduct recognition", () => {
  it("accepts CODE_OF_CONDUCT.md", () => {
    expect(dxFor(["CODE_OF_CONDUCT.md"]).hasCodeOfConduct).toBe(true);
  });
  it("accepts CODE_OF_CONDUCT.rst", () => {
    expect(dxFor(["CODE_OF_CONDUCT.rst"]).hasCodeOfConduct).toBe(true);
  });
  it("accepts Code-of-conduct.md (hyphenated express-style)", () => {
    expect(dxFor(["Code-of-conduct.md"]).hasCodeOfConduct).toBe(true);
  });
  it("accepts CODE_OF_CONDUCT with no extension", () => {
    expect(dxFor(["CODE_OF_CONDUCT"]).hasCodeOfConduct).toBe(true);
  });
});

describe("Honesty contract — SECURITY.md recognition", () => {
  it("accepts SECURITY.md", () => {
    expect(secFor(["SECURITY.md"]).hasSecurityPolicy).toBe(true);
  });
  it("accepts SECURITY.rst", () => {
    expect(secFor(["SECURITY.rst"]).hasSecurityPolicy).toBe(true);
  });
  it("accepts SECURITY with no extension", () => {
    expect(secFor(["SECURITY"]).hasSecurityPolicy).toBe(true);
  });
  it("accepts docs/SECURITY.md", () => {
    expect(secFor(["docs/SECURITY.md"]).hasSecurityPolicy).toBe(true);
  });
});

describe("Honesty contract — riskEngine respects the dx-detector's org-fallback", () => {
  it("does NOT emit 'No contributing guide' when org-fallback supplied it", () => {
    // Build a bundle that lacks CONTRIBUTING locally but has it via
    // org-health. runAudit should see hasContributingGuide=true and
    // skip the finding.
    const bundle = makeBundle({
      paths: ["README.md", "LICENSE", "package.json"],
      readmeContent: "# Project\n## Installation\nnpm install demo",
      orgHealth: {
        owner: "test",
        hasOrgRepo: true,
        securityPolicyPath: null,
        securityPolicyContent: null,
        codeOfConductPath: null,
        codeOfConductContent: null,
        contributingPath: "CONTRIBUTING.md",
        contributingContent: "Thanks for contributing!",
      },
    });
    const result = runAudit(bundle);
    const titles = result.findings.map((f) => f.title);
    expect(
      titles,
      "expected no 'No contributing guide' finding when org-fallback covers it",
    ).not.toContain("No contributing guide detected");
  });

  it("DOES emit 'No contributing guide' when neither local nor org-fallback supplies one", () => {
    const bundle = makeBundle({
      paths: ["README.md", "LICENSE", "package.json"],
      readmeContent: "# Project\n## Installation\nnpm install demo",
    });
    const result = runAudit(bundle);
    const titles = result.findings.map((f) => f.title);
    expect(titles).toContain("No contributing guide detected");
  });
});
