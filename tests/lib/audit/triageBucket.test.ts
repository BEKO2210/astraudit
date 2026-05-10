/**
 * Regression: the maintainer-reported triage contradiction.
 *
 * The "Open queue" insight card on the dashboard was rendering
 *   "0× more issues than PRs · A real backlog has built up"
 * for a small repo with 0 open issues + a handful of open PRs.
 * Two compounding bugs:
 *   1. `issuePrRatio = openIssues / openPRs` produces `0` when
 *      issues = 0, which got rendered literally as "0×".
 *   2. `bucketTriage` bucketed any non-tiny `(issues+prs) / stars`
 *      ratio as "backlog" / "heavy", regardless of whether the
 *      issue count was actually zero. PRs alone are normal
 *      maintenance flow, not a backlog signal.
 *
 * These tests freeze the corrected behaviour: a backlog requires
 * actual issues; a meaningful ratio requires both sides > 0; the
 * panel label degrades gracefully across all four shape combos.
 */

import { describe, expect, it } from "vitest";
import { deriveInsights } from "../../../src/lib/audit/insightEngine";
import { makeBundle } from "../../fixtures/builders";
import { classifyFiles } from "../../../src/lib/audit/fileClassifier";
import { detectStack } from "../../../src/lib/audit/stackDetector";
import { analyzeReadme } from "../../../src/lib/audit/documentationDetector";
import { analyzeDependencies } from "../../../src/lib/audit/dependencyDetector";
import { analyzeMaintenance } from "../../../src/lib/audit/maintenanceDetector";
import { analyzeCi } from "../../../src/lib/audit/ciDetector";
import { analyzeSecurity } from "../../../src/lib/audit/securityDetector";

function insightsFor(opts: {
  openIssues: number;
  openPRs: number | null;
  stars: number;
}): ReturnType<typeof deriveInsights> {
  const bundle = makeBundle({
    metadata: { stars: opts.stars },
    paths: ["README.md", "package.json"],
    importantFiles: { "package.json": JSON.stringify({ name: "x" }) },
    issues: { openIssueCount: opts.openIssues, openPRCount: opts.openPRs },
  });
  const classified = classifyFiles(bundle.tree, bundle.importantFiles);
  const stack = detectStack(classified, bundle.languages);
  const deps = analyzeDependencies(classified);
  const readme = analyzeReadme(bundle.readme);
  const security = analyzeSecurity(classified, bundle.orgHealth);
  const maintenance = analyzeMaintenance(bundle);
  const ci = analyzeCi(classified, bundle.workflows);
  return deriveInsights({
    bundle,
    classified,
    readme,
    deps,
    security,
    maintenance,
    ci,
    stack,
  });
}

describe("triage health — bucketTriage contract", () => {
  it("is 'healthy' when there are zero open issues regardless of PR count", () => {
    const small = insightsFor({ openIssues: 0, openPRs: 4, stars: 0 });
    expect(small.triageHealth).toBe("healthy");
    const big = insightsFor({ openIssues: 0, openPRs: 25, stars: 100 });
    expect(big.triageHealth).toBe("healthy");
  });

  it("is 'healthy' when both queues are empty", () => {
    const out = insightsFor({ openIssues: 0, openPRs: 0, stars: 1234 });
    expect(out.triageHealth).toBe("healthy");
  });

  it("a small repo with 5 open issues + few PRs stays 'healthy'", () => {
    // Ratio-based bucketing used to flag this as 'backlog' purely
    // because the absolute count crossed 0.02 of the (zero) star
    // base. Absolute floor now keeps it healthy.
    const out = insightsFor({ openIssues: 5, openPRs: 2, stars: 0 });
    expect(out.triageHealth).toBe("healthy");
  });

  it("a real backlog (≥ 250 open issues) triggers 'backlog'", () => {
    const out = insightsFor({ openIssues: 300, openPRs: 5, stars: 5_000 });
    expect(out.triageHealth).toBe("backlog");
  });

  it("a serious queue (> 1,000 open issues) triggers 'heavy'", () => {
    const out = insightsFor({ openIssues: 1_500, openPRs: 50, stars: 10_000 });
    expect(out.triageHealth).toBe("heavy");
  });
});

describe("issuePrRatio — only meaningful when both sides > 0", () => {
  it("is null when there are zero open issues", () => {
    const out = insightsFor({ openIssues: 0, openPRs: 5, stars: 0 });
    expect(out.issuePrRatio).toBeNull();
  });

  it("is null when there are zero open PRs", () => {
    const out = insightsFor({ openIssues: 12, openPRs: 0, stars: 100 });
    expect(out.issuePrRatio).toBeNull();
  });

  it("is the rounded ratio when both sides are positive", () => {
    const out = insightsFor({ openIssues: 30, openPRs: 6, stars: 1_000 });
    expect(out.issuePrRatio).toBe(5);
  });
});

describe("openQueueLabel — humane copy across all four shapes", () => {
  it("'Empty queue' when nothing is open", () => {
    const out = insightsFor({ openIssues: 0, openPRs: 0, stars: 200 });
    expect(out.openQueueLabel).toBe("Empty queue");
  });

  it("'N open PR(s), no issues' when PRs exist but no issues", () => {
    const a = insightsFor({ openIssues: 0, openPRs: 1, stars: 0 });
    expect(a.openQueueLabel).toBe("1 open PR, no issues");
    const b = insightsFor({ openIssues: 0, openPRs: 4, stars: 0 });
    expect(b.openQueueLabel).toBe("4 open PRs, no issues");
  });

  it("'N open issue(s), no PRs' when issues exist but no PRs", () => {
    const out = insightsFor({ openIssues: 7, openPRs: 0, stars: 100 });
    expect(out.openQueueLabel).toBe("7 open issues, no PRs");
  });

  it("'X× more issues than PRs' when both sides are positive", () => {
    const out = insightsFor({ openIssues: 30, openPRs: 6, stars: 1_000 });
    expect(out.openQueueLabel).toBe("5× more issues than PRs");
  });

  it("singular vs plural agreement", () => {
    const single = insightsFor({ openIssues: 1, openPRs: 0, stars: 0 });
    expect(single.openQueueLabel).toBe("1 open issue, no PRs");
  });
});
