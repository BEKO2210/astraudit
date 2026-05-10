import { describe, expect, it } from "vitest";
import {
  buildCompareResult,
  compareCategories,
  compareFindings,
  compareStack,
} from "../../../src/lib/compare/diff";
import { runAudit } from "../../../src/lib/audit/auditEngine";
import { makeBundle } from "../../fixtures/builders";
import type { Finding } from "../../../src/types/finding";
import type { AuditResult, CategoryScore } from "../../../src/types/audit";

function cat(key: string, score: number, max = 15): CategoryScore {
  return {
    key: key as CategoryScore["key"],
    label: key,
    score,
    max,
    status: "partial",
    summary: "",
    evidence: [],
  };
}

function finding(title: string, category: string, severity: Finding["severity"] = "medium"): Finding {
  return {
    id: `${category}-${title}`,
    title,
    category: category as Finding["category"],
    severity,
    description: "",
    evidence: "",
    recommendation: "",
    affectedFiles: [],
    confidence: "medium",
  };
}

describe("compareCategories", () => {
  it("computes deltas, labels and winners per category", () => {
    const a = [cat("security", 12), cat("quality", 8)];
    const b = [cat("security", 8), cat("quality", 8)];
    const out = compareCategories(a, b);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      key: "security",
      delta: 4,
      deltaLabel: "+4",
      winner: "left",
    });
    expect(out[1]).toMatchObject({ winner: "tie", deltaLabel: "±0" });
  });

  it("only considers categories present in both inputs", () => {
    const a = [cat("security", 5)];
    const b = [cat("quality", 5)];
    expect(compareCategories(a, b)).toEqual([]);
  });
});

describe("compareFindings", () => {
  it("splits into onlyLeft, onlyRight, shared", () => {
    const left = [
      finding("A", "security"),
      finding("B", "documentation"),
      finding("C", "quality"),
    ];
    const right = [
      finding("B", "documentation", "high"), // same key, different severity
      finding("D", "ci"),
    ];
    const diff = compareFindings(left, right);
    expect(diff.onlyInLeft.map((f) => f.title)).toEqual(["A", "C"]);
    expect(diff.onlyInRight.map((f) => f.title)).toEqual(["D"]);
    expect(diff.shared).toHaveLength(1);
    expect(diff.shared[0].same).toBe(false);
  });

  it("matches case-insensitively on titles", () => {
    const left = [finding("Add a LICENSE file", "security")];
    const right = [finding("add a license file", "security")];
    const diff = compareFindings(left, right);
    expect(diff.shared).toHaveLength(1);
    expect(diff.onlyInLeft).toHaveLength(0);
    expect(diff.onlyInRight).toHaveLength(0);
  });
});

describe("compareStack", () => {
  it("diffs framework / build-tool lists into shared/onlyA/onlyB", () => {
    const stack = (overrides: Partial<AuditResult["stack"]> = {}): AuditResult["stack"] => ({
      language: "TypeScript",
      languages: [],
      packageManager: "pnpm",
      runtime: "Node.js",
      frameworks: [],
      buildTools: [],
      testTools: [],
      lintTools: [],
      monorepoTool: null,
      containerized: false,
      hasLockfile: true,
      dependencyCounts: null,
      envManagers: [],
      pythonTools: [],
      sboms: [],
      aiDevTools: [],
      ...overrides,
    });
    const out = compareStack(
      stack({ frameworks: ["React", "Tailwind CSS"], buildTools: ["Vite"] }),
      stack({ frameworks: ["Vue", "Tailwind CSS"], buildTools: ["Vite", "tsup"] }),
    );
    expect(out.frameworks.shared).toEqual(["Tailwind CSS"]);
    expect(out.frameworks.onlyInLeft).toEqual(["React"]);
    expect(out.frameworks.onlyInRight).toEqual(["Vue"]);
    expect(out.buildTools.shared).toEqual(["Vite"]);
    expect(out.buildTools.onlyInRight).toEqual(["tsup"]);
  });

  it("flags scalar facts as same/different", () => {
    const out = compareStack(
      {
        language: "TypeScript",
        languages: [],
        packageManager: "pnpm",
        runtime: "Node.js",
        frameworks: [],
        buildTools: [],
        testTools: [],
        lintTools: [],
        monorepoTool: null,
        containerized: false,
        hasLockfile: true,
        dependencyCounts: null,
        envManagers: [],
        pythonTools: [],
        sboms: [],
        aiDevTools: [],
      },
      {
        language: "TypeScript",
        languages: [],
        packageManager: "yarn",
        runtime: "Node.js",
        frameworks: [],
        buildTools: [],
        testTools: [],
        lintTools: [],
        monorepoTool: null,
        containerized: false,
        hasLockfile: true,
        dependencyCounts: null,
        envManagers: [],
        pythonTools: [],
        sboms: [],
        aiDevTools: [],
      },
    );
    const language = out.scalarFacts.find((s) => s.label === "Primary language");
    const pm = out.scalarFacts.find((s) => s.label === "Package manager");
    expect(language?.same).toBe(true);
    expect(pm?.same).toBe(false);
  });
});

describe("buildCompareResult (integration)", () => {
  it("produces a sensible verdict when one repo has more signals", () => {
    const strong = runAudit(
      makeBundle({
        paths: [
          "README.md",
          "LICENSE",
          "SECURITY.md",
          ".github/workflows/ci.yml",
          "package.json",
        ],
        readmeContent: "# Demo\n## Installation\nnpm install demo",
      }),
    );
    const weak = runAudit(
      makeBundle({
        paths: ["README.md", "package.json"],
        readmeContent: "tiny readme",
      }),
    );
    const out = buildCompareResult(strong, weak);
    expect(out.summary.totalDelta).toBeGreaterThan(0);
    expect(out.summary.winner).toBe("left");
    expect(out.summary.catWins.left).toBeGreaterThan(out.summary.catWins.right);
  });
});
