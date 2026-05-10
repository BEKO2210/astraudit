/**
 * Regression: when a repo has no SECURITY.md / CODE_OF_CONDUCT.md /
 * CONTRIBUTING.md of its own, GitHub's UI inherits those from the
 * owner's `.github` repo. We mirror that fallback so we don't
 * false-flag big orgs (express, eslint, etc.) that centralize their
 * community-health files.
 *
 * The bug that motivated this test was filed against express:
 * the `?tab=security-ov-file` page renders the policy from
 * `expressjs/.github`, but Astraudit reported "missing".
 */

import { describe, expect, it } from "vitest";
import { analyzeSecurity } from "../../../src/lib/audit/securityDetector";
import { analyzeDx } from "../../../src/lib/audit/dxDetector";
import { classifyFiles } from "../../../src/lib/audit/fileClassifier";
import type { OrgHealthSnapshot, RepoTree } from "../../../src/types/github";

const emptyTree: RepoTree = {
  truncated: false,
  entries: [
    { path: "README.md", type: "blob", size: 100, sha: "1" },
    { path: "package.json", type: "blob", size: 100, sha: "2" },
  ],
};

const orgHealthWithSecurity: OrgHealthSnapshot = {
  owner: "expressjs",
  hasOrgRepo: true,
  securityPolicyPath: "SECURITY.md",
  securityPolicyContent:
    "# Security Policy\n\nReport vulnerabilities to security@example.com.",
  codeOfConductPath: null,
  codeOfConductContent: null,
  contributingPath: null,
  contributingContent: null,
};

const orgHealthEmpty: OrgHealthSnapshot = {
  owner: "expressjs",
  hasOrgRepo: false,
  securityPolicyPath: null,
  securityPolicyContent: null,
  codeOfConductPath: null,
  codeOfConductContent: null,
  contributingPath: null,
  contributingContent: null,
};

describe("analyzeSecurity — org-level .github fallback", () => {
  it("reports the security policy as PRESENT when the org's .github repo carries it", () => {
    const classified = classifyFiles(emptyTree, []);
    const security = analyzeSecurity(classified, orgHealthWithSecurity);
    expect(security.hasSecurityPolicy).toBe(true);
    expect(security.securityPolicySource).toBe("org-fallback");
    expect(security.securityPolicy).not.toBeNull();
  });

  it("still reports missing when neither repo nor org carries the file", () => {
    const classified = classifyFiles(emptyTree, []);
    const security = analyzeSecurity(classified, orgHealthEmpty);
    expect(security.hasSecurityPolicy).toBe(false);
    expect(security.securityPolicySource).toBeNull();
  });

  it("prefers the in-repo file over the org fallback when both exist", () => {
    const tree: RepoTree = {
      truncated: false,
      entries: [
        ...emptyTree.entries,
        { path: "SECURITY.md", type: "blob", size: 200, sha: "3" },
      ],
    };
    const classified = classifyFiles(tree, [
      {
        path: "SECURITY.md",
        size: 200,
        content: "# Security Policy\n\nLocal copy. Email security@local.example.",
        truncated: false,
      },
    ]);
    const security = analyzeSecurity(classified, orgHealthWithSecurity);
    expect(security.hasSecurityPolicy).toBe(true);
    expect(security.securityPolicySource).toBe("repo");
  });

  it("works when no orgHealth snapshot is supplied at all", () => {
    const classified = classifyFiles(emptyTree, []);
    const security = analyzeSecurity(classified);
    expect(security.hasSecurityPolicy).toBe(false);
    expect(security.securityPolicySource).toBeNull();
  });
});

describe("analyzeDx — org-level .github fallback", () => {
  const readme = {
    mentionsInstall: true,
    mentionsUsage: true,
    sectionCount: 5,
    sectionTitles: [],
    wordCount: 1000,
    hasBadges: false,
    hasTOC: false,
    hasShield: false,
    hasInstallationSection: false,
    hasUsageSection: false,
    hasContributing: false,
    hasLicenseRef: false,
    headingsTooDeep: false,
  };
  const deps = {
    runtimeDeps: [],
    devDeps: [],
    scriptKeys: ["build", "test", "lint"],
    runtimeDepCount: 0,
    devDepCount: 0,
    workspaceCount: 0,
    locks: [],
    hasLockfile: false,
    multipleLockfiles: false,
    nodeEngine: null,
    isMonorepo: false,
    hasPackageJson: true,
  };

  it("reports CODE_OF_CONDUCT and CONTRIBUTING as present via the org fallback", () => {
    const classified = classifyFiles(emptyTree, []);
    const orgHealth: OrgHealthSnapshot = {
      ...orgHealthEmpty,
      hasOrgRepo: true,
      codeOfConductPath: "CODE_OF_CONDUCT.md",
      codeOfConductContent: "# Code of Conduct",
      contributingPath: "CONTRIBUTING.md",
      contributingContent: "# Contributing",
    };
    const dx = analyzeDx(classified, readme as never, deps as never, orgHealth);
    expect(dx.hasCodeOfConduct).toBe(true);
    expect(dx.codeOfConductSource).toBe("org-fallback");
    expect(dx.hasContributingGuide).toBe(true);
    expect(dx.contributingGuideSource).toBe("org-fallback");
  });
});
