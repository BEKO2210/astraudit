/**
 * Phase 6.46 — focused copyEngine coverage.
 *
 * `copyEngine.ts` is exercised end-to-end by every auditEngine test,
 * but the four ratio buckets in `buildHeadlineVerdict` (premium /
 * solid / workable / uneven / fragile) plus the age + freshness
 * clauses don't have dedicated cases. This file targets the
 * bucket-flip boundaries so a future refactor can't quietly invert
 * the verdict tone for an established repo with a strong audit.
 */

import { describe, expect, it } from "vitest";
import { buildHeadlineVerdict } from "../../../src/lib/audit/copyEngine";
import type { CategoryScore, StackSignals } from "../../../src/types/audit";
import type { RepoBundle } from "../../../src/types/github";
import type { ClassifiedFiles } from "../../../src/lib/audit/fileClassifier";
import type { DerivedInsights } from "../../../src/lib/audit/insightEngine";

function categories(score: number, max = 100): CategoryScore[] {
  return [
    {
      key: "documentation",
      label: "Documentation",
      score,
      max,
      status: "partial",
      summary: "",
      evidence: [],
    },
  ];
}

function ctx(opts: {
  score: number;
  max?: number;
  ageBucket?: DerivedInsights["ageBucket"];
  freshness?: DerivedInsights["freshnessBucket"];
  audience?: string;
}): Parameters<typeof buildHeadlineVerdict>[0] {
  const insights = {
    ageBucket: opts.ageBucket ?? "established",
    freshnessBucket: opts.freshness ?? "fresh",
    audienceLabel: opts.audience ?? "general-purpose library",
    // The headline-verdict only reads ageBucket / freshnessBucket /
    // audienceLabel, so we cast the partial through `unknown` to keep
    // the test wide-open without a full builder.
  } as unknown as DerivedInsights;
  return {
    bundle: {} as RepoBundle,
    insights,
    stack: {} as StackSignals,
    classified: {} as ClassifiedFiles,
    categories: categories(opts.score, opts.max ?? 100),
  };
}

describe("buildHeadlineVerdict — tone buckets", () => {
  it("calls 90% 'premium-grade'", () => {
    expect(buildHeadlineVerdict(ctx({ score: 90 }))).toMatch(/premium-grade/i);
  });
  it("calls 75% 'Solid fundamentals'", () => {
    expect(buildHeadlineVerdict(ctx({ score: 75 }))).toMatch(/Solid fundamentals/i);
  });
  it("calls 60% 'Workable but with visible gaps'", () => {
    expect(buildHeadlineVerdict(ctx({ score: 60 }))).toMatch(/Workable/i);
  });
  it("calls 45% 'Uneven baseline'", () => {
    expect(buildHeadlineVerdict(ctx({ score: 45 }))).toMatch(/Uneven/i);
  });
  it("calls 25% 'Fragile baseline'", () => {
    expect(buildHeadlineVerdict(ctx({ score: 25 }))).toMatch(/Fragile/i);
  });
});

describe("buildHeadlineVerdict — age + freshness clauses", () => {
  it("threads the 'recently published' age clause through for newborns", () => {
    const out = buildHeadlineVerdict(
      ctx({ score: 80, ageBucket: "newborn", freshness: "fresh" }),
    );
    expect(out).toMatch(/recently published/i);
  });

  it("threads the 'effectively dormant' freshness clause through for abandoned repos", () => {
    const out = buildHeadlineVerdict(
      ctx({ score: 50, ageBucket: "veteran", freshness: "abandoned" }),
    );
    expect(out).toMatch(/effectively dormant/i);
  });

  it("uses the audience label verbatim", () => {
    const out = buildHeadlineVerdict(
      ctx({ score: 70, audience: "shadcn-style component library" }),
    );
    expect(out).toMatch(/shadcn-style component library/i);
  });

  it("handles a zero-max category list without dividing by zero", () => {
    // CategoryScore[] with max=0 would zero the ratio; verdict should
    // fall into the lowest bucket without crashing.
    const out = buildHeadlineVerdict(ctx({ score: 0, max: 0 }));
    expect(out).toMatch(/Fragile/i);
  });
});
