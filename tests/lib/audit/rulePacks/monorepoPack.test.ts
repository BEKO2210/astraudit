import { describe, expect, it } from "vitest";
import { runMonorepoPack, __test } from "../../../../src/lib/audit/rulePacks/packs/monorepo";
import { classifyFiles } from "../../../../src/lib/audit/fileClassifier";
import { analyzeDependencies } from "../../../../src/lib/audit/dependencyDetector";
import { makeBundle } from "../../../fixtures/builders";
import type { RulePackContext } from "../../../../src/lib/audit/rulePacks/types";

function makeContext(opts: {
  paths?: string[];
  importantFiles?: Record<string, string | null>;
}): RulePackContext {
  const bundle = makeBundle({
    paths: opts.paths ?? [],
    importantFiles: opts.importantFiles ?? {},
  });
  const classified = classifyFiles(bundle.tree, bundle.importantFiles);
  const deps = analyzeDependencies(classified);
  return { bundle, classified, deps };
}

describe("workspaceGlobs", () => {
  it("returns [] when no workspaces field", () => {
    expect(__test.workspaceGlobs(null)).toEqual([]);
    expect(__test.workspaceGlobs({})).toEqual([]);
  });

  it("returns the array form directly", () => {
    expect(__test.workspaceGlobs({ workspaces: ["packages/*", "apps/*"] })).toEqual([
      "packages/*",
      "apps/*",
    ]);
  });

  it("unwraps the object form { packages: [...] }", () => {
    expect(
      __test.workspaceGlobs({ workspaces: { packages: ["packages/*"] } }),
    ).toEqual(["packages/*"]);
  });
});

describe("innerPackageCount", () => {
  it("counts packages/*/package.json and apps/*/package.json", () => {
    const ctx = makeContext({
      paths: [
        "packages/foo/package.json",
        "packages/bar/package.json",
        "apps/web/package.json",
        "src/index.ts",
      ],
    });
    const { total, packages } = __test.innerPackageCount(ctx);
    expect(total).toBe(3);
    expect(packages).toHaveLength(3);
  });

  it("does NOT count nested package.json beyond one level", () => {
    const ctx = makeContext({
      paths: ["packages/foo/sub/package.json"],
    });
    expect(__test.innerPackageCount(ctx).total).toBe(0);
  });
});

describe("runMonorepoPack (M5.4)", () => {
  it("is silent on a single-package repo (no monorepo signals)", () => {
    const findings = runMonorepoPack(
      makeContext({
        paths: ["package.json", "src/index.ts"],
        importantFiles: { "package.json": JSON.stringify({ name: "single" }) },
      }),
    );
    expect(findings).toEqual([]);
  });

  it("emits `monorepo-detected` (INFO) when workspaces field is present", () => {
    const findings = runMonorepoPack(
      makeContext({
        paths: ["package.json", "packages/foo/package.json"],
        importantFiles: {
          "package.json": JSON.stringify({
            name: "root",
            workspaces: ["packages/*"],
          }),
        },
      }),
    );
    const detected = findings.find((f) => f.id === "monorepo-detected");
    expect(detected).toBeDefined();
    expect(detected!.severity).toBe("info");
    expect(detected!.evidence).toContain("packages/*");
  });

  it("emits `monorepo-detected` for pnpm-workspace.yaml alone", () => {
    const findings = runMonorepoPack(
      makeContext({
        paths: ["pnpm-workspace.yaml", "packages/foo/package.json"],
      }),
    );
    expect(findings.find((f) => f.id === "monorepo-detected")).toBeDefined();
  });

  it("emits `monorepo-no-orchestrator` when workspaces but no tool config", () => {
    const findings = runMonorepoPack(
      makeContext({
        paths: ["package.json", "packages/foo/package.json"],
        importantFiles: {
          "package.json": JSON.stringify({ workspaces: ["packages/*"] }),
        },
      }),
    );
    expect(findings.find((f) => f.id === "monorepo-no-orchestrator")?.severity).toBe(
      "low",
    );
  });

  it("does NOT emit `no-orchestrator` when turbo.json is present", () => {
    const findings = runMonorepoPack(
      makeContext({
        paths: ["package.json", "turbo.json", "packages/foo/package.json"],
        importantFiles: {
          "package.json": JSON.stringify({ workspaces: ["packages/*"] }),
          "turbo.json": "{}",
        },
      }),
    );
    expect(findings.find((f) => f.id === "monorepo-no-orchestrator")).toBeUndefined();
  });

  it("emits `packages-not-declared` when inner packages exist but no workspaces field", () => {
    const findings = runMonorepoPack(
      makeContext({
        paths: ["package.json", "packages/foo/package.json", "packages/bar/package.json"],
        importantFiles: {
          "package.json": JSON.stringify({ name: "root" }),
        },
      }),
    );
    const f = findings.find((f) => f.id === "monorepo-packages-not-declared");
    expect(f?.severity).toBe("low");
    expect(f?.title).toContain("2");
  });

  it("emits `multiple-orchestrators` when both turbo.json AND nx.json exist", () => {
    const findings = runMonorepoPack(
      makeContext({
        paths: ["package.json", "turbo.json", "nx.json", "packages/foo/package.json"],
        importantFiles: {
          "package.json": JSON.stringify({ workspaces: ["packages/*"] }),
          "turbo.json": "{}",
          "nx.json": "{}",
        },
      }),
    );
    const f = findings.find((f) => f.id === "monorepo-multiple-orchestrators");
    expect(f?.severity).toBe("low");
    expect(f?.evidence).toContain("turbo.json");
    expect(f?.evidence).toContain("nx.json");
  });

  it("emits `changesets-detected` when .changeset/ folder is present", () => {
    const findings = runMonorepoPack(
      makeContext({
        paths: ["package.json", "packages/foo/package.json", ".changeset/config.json"],
        importantFiles: {
          "package.json": JSON.stringify({ workspaces: ["packages/*"] }),
        },
      }),
    );
    expect(findings.find((f) => f.id === "monorepo-changesets-detected")?.severity).toBe(
      "info",
    );
  });

  it("recognises the yarn-classic object workspaces shape", () => {
    const findings = runMonorepoPack(
      makeContext({
        paths: ["package.json", "packages/foo/package.json"],
        importantFiles: {
          "package.json": JSON.stringify({
            workspaces: { packages: ["packages/*"], nohoist: ["**/react-native"] },
          }),
        },
      }),
    );
    expect(findings.find((f) => f.id === "monorepo-detected")).toBeDefined();
    // No false `packages-not-declared` warning since the field IS present.
    expect(
      findings.find((f) => f.id === "monorepo-packages-not-declared"),
    ).toBeUndefined();
  });

  it("ignores malformed package.json without crashing", () => {
    const findings = runMonorepoPack(
      makeContext({
        paths: ["package.json", "packages/foo/package.json"],
        importantFiles: { "package.json": "{not valid json" },
      }),
    );
    // The packages/ folder still triggers the not-declared warning,
    // proving the parser failure didn't short-circuit detection.
    expect(findings.find((f) => f.id === "monorepo-packages-not-declared")).toBeDefined();
  });
});
