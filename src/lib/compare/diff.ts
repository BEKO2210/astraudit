/**
 * Side-by-side audit diff helpers.
 *
 * Each helper takes two AuditResult objects and returns a structured
 * diff that the CompareDashboard renders. We deliberately don't mutate
 * the inputs — every diff is a fresh, plain object.
 */

import type { AuditResult, CategoryScore } from "../../types/audit";
import type { Finding, FindingCategory } from "../../types/finding";

export interface CategoryComparison {
  key: FindingCategory;
  label: string;
  left: number;
  right: number;
  max: number;
  delta: number;
  /** "+5" / "-3" / "±0" string for display. */
  deltaLabel: string;
  winner: "left" | "right" | "tie";
}

export interface FindingDiff {
  onlyInLeft: Finding[];
  onlyInRight: Finding[];
  shared: Array<{ left: Finding; right: Finding; same: boolean }>;
}

export interface StackDiffSection {
  label: string;
  onlyInLeft: string[];
  onlyInRight: string[];
  shared: string[];
}

export interface StackDiff {
  frameworks: StackDiffSection;
  buildTools: StackDiffSection;
  testTools: StackDiffSection;
  lintTools: StackDiffSection;
  envManagers: StackDiffSection;
  pythonTools: StackDiffSection;
  aiDevTools: StackDiffSection;
  /** Top-level signals that don't lend themselves to list-diffing. */
  scalarFacts: Array<{ label: string; left: string; right: string; same: boolean }>;
}

export interface CompareSummary {
  totalDelta: number;
  totalDeltaLabel: string;
  winner: "left" | "right" | "tie";
  catWins: { left: number; right: number; tie: number };
}

export interface CompareResult {
  left: AuditResult;
  right: AuditResult;
  categories: CategoryComparison[];
  findings: FindingDiff;
  stack: StackDiff;
  summary: CompareSummary;
}

function diffLabel(delta: number): string {
  if (delta === 0) return "±0";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export function compareCategories(
  left: CategoryScore[],
  right: CategoryScore[],
): CategoryComparison[] {
  const rightByKey = new Map(right.map((c) => [c.key, c] as const));
  const out: CategoryComparison[] = [];
  for (const a of left) {
    const b = rightByKey.get(a.key);
    if (!b) continue;
    const delta = a.score - b.score;
    out.push({
      key: a.key,
      label: a.label,
      left: a.score,
      right: b.score,
      max: a.max,
      delta,
      deltaLabel: diffLabel(delta),
      winner: delta > 0 ? "left" : delta < 0 ? "right" : "tie",
    });
  }
  return out;
}

function findingKey(f: Finding): string {
  return `${f.category}::${f.title.toLowerCase()}`;
}

export function compareFindings(left: Finding[], right: Finding[]): FindingDiff {
  const leftByKey = new Map(left.map((f) => [findingKey(f), f] as const));
  const rightByKey = new Map(right.map((f) => [findingKey(f), f] as const));
  const onlyInLeft: Finding[] = [];
  const onlyInRight: Finding[] = [];
  const shared: Array<{ left: Finding; right: Finding; same: boolean }> = [];

  for (const [key, l] of leftByKey) {
    const r = rightByKey.get(key);
    if (!r) {
      onlyInLeft.push(l);
    } else {
      shared.push({
        left: l,
        right: r,
        same: l.severity === r.severity && l.confidence === r.confidence,
      });
    }
  }
  for (const [key, r] of rightByKey) {
    if (!leftByKey.has(key)) onlyInRight.push(r);
  }
  return { onlyInLeft, onlyInRight, shared };
}

function listDiff(
  label: string,
  left: string[] | undefined,
  right: string[] | undefined,
): StackDiffSection {
  const a = left ?? [];
  const b = right ?? [];
  const setA = new Set(a);
  const setB = new Set(b);
  return {
    label,
    onlyInLeft: a.filter((x) => !setB.has(x)),
    onlyInRight: b.filter((x) => !setA.has(x)),
    shared: a.filter((x) => setB.has(x)),
  };
}

export function compareStack(
  left: AuditResult["stack"],
  right: AuditResult["stack"],
): StackDiff {
  const scalar: StackDiff["scalarFacts"] = [];
  const push = (label: string, l: string, r: string) =>
    scalar.push({ label, left: l, right: r, same: l === r });

  push("Primary language", left.language ?? "Not detected", right.language ?? "Not detected");
  push("Runtime", left.runtime ?? "Not detected", right.runtime ?? "Not detected");
  push("Package manager", left.packageManager ?? "Not detected", right.packageManager ?? "Not detected");
  push("Monorepo tool", left.monorepoTool ?? "single repo", right.monorepoTool ?? "single repo");
  push("Containerized", left.containerized ? "yes" : "no", right.containerized ? "yes" : "no");
  push("Lockfile", left.hasLockfile ? "present" : "missing", right.hasLockfile ? "present" : "missing");

  return {
    frameworks: listDiff("Frameworks", left.frameworks, right.frameworks),
    buildTools: listDiff("Build tools", left.buildTools, right.buildTools),
    testTools: listDiff("Test tools", left.testTools, right.testTools),
    lintTools: listDiff("Lint/format", left.lintTools, right.lintTools),
    envManagers: listDiff("Env managers", left.envManagers, right.envManagers),
    pythonTools: listDiff("Python tools", left.pythonTools, right.pythonTools),
    aiDevTools: listDiff("AI tooling", left.aiDevTools, right.aiDevTools),
    scalarFacts: scalar,
  };
}

export function buildCompareResult(
  left: AuditResult,
  right: AuditResult,
): CompareResult {
  const categories = compareCategories(left.categories, right.categories);
  const findings = compareFindings(left.findings, right.findings);
  const stack = compareStack(left.stack, right.stack);

  const totalDelta = left.totalScore - right.totalScore;
  const catWins = categories.reduce(
    (acc, c) => {
      acc[c.winner] += 1;
      return acc;
    },
    { left: 0, right: 0, tie: 0 },
  );
  const summary: CompareSummary = {
    totalDelta,
    totalDeltaLabel: diffLabel(totalDelta),
    winner: totalDelta > 0 ? "left" : totalDelta < 0 ? "right" : "tie",
    catWins,
  };

  return { left, right, categories, findings, stack, summary };
}
