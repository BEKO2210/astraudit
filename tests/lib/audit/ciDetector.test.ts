import { describe, expect, it } from "vitest";
import { classifyFiles } from "../../../src/lib/audit/fileClassifier";
import { analyzeCi } from "../../../src/lib/audit/ciDetector";
import { makeTree } from "../../fixtures/builders";

function classify(paths: string[]) {
  return classifyFiles(makeTree(paths), []);
}

describe("analyzeCi", () => {
  it("recognises GitHub Actions from .github/workflows", () => {
    const ci = analyzeCi(classify([".github/workflows/ci.yml"]), []);
    expect(ci.hasGithubActions).toBe(true);
    expect(ci.providers.map((p) => p.id)).toContain("github-actions");
  });

  it("uses the API workflows fast-path even when tree lost the path", () => {
    const ci = analyzeCi(classify([]), [
      { name: "CI", path: ".github/workflows/ci.yml", state: "active" },
    ]);
    expect(ci.hasGithubActions).toBe(true);
    expect(ci.providers.some((p) => p.id === "github-actions")).toBe(true);
  });

  it("recognises GitLab CI", () => {
    const ci = analyzeCi(classify([".gitlab-ci.yml"]), []);
    const ids = ci.providers.map((p) => p.id);
    expect(ids).toContain("gitlab-ci");
  });

  it("recognises CircleCI", () => {
    const ci = analyzeCi(classify([".circleci/config.yml"]), []);
    expect(ci.providers.map((p) => p.id)).toContain("circleci");
  });

  it("recognises Travis, AppVeyor, Buildkite", () => {
    expect(analyzeCi(classify([".travis.yml"]), []).providers.map((p) => p.id)).toContain("travis");
    expect(analyzeCi(classify(["appveyor.yml"]), []).providers.map((p) => p.id)).toContain("appveyor");
    expect(
      analyzeCi(classify([".buildkite/pipeline.yml"]), []).providers.map((p) => p.id),
    ).toContain("buildkite");
  });

  it("recognises Jenkinsfile and Azure Pipelines (file or folder)", () => {
    expect(analyzeCi(classify(["Jenkinsfile"]), []).providers.map((p) => p.id)).toContain("jenkins");
    expect(
      analyzeCi(classify(["azure-pipelines.yml"]), []).providers.map((p) => p.id),
    ).toContain("azure-pipelines");
    expect(
      analyzeCi(classify([".azure-pipelines/main.yml"]), []).providers.map((p) => p.id),
    ).toContain("azure-pipelines");
  });

  it("handles multi-provider repos", () => {
    const ci = analyzeCi(classify([".github/workflows/ci.yml", "azure-pipelines.yml"]), []);
    const ids = ci.providers.map((p) => p.id);
    expect(ids).toContain("github-actions");
    expect(ids).toContain("azure-pipelines");
  });

  it("reports no CI when nothing is present", () => {
    const ci = analyzeCi(classify(["src/index.ts", "README.md"]), []);
    expect(ci.hasWorkflows).toBe(false);
    expect(ci.providers).toEqual([]);
  });

  it("matches workflow buckets via filename keywords", () => {
    const ci = analyzeCi(
      classify([
        ".github/workflows/build.yml",
        ".github/workflows/test.yml",
        ".github/workflows/deploy.yml",
        ".github/workflows/codeql.yml",
      ]),
      [],
    );
    expect(ci.hasBuildWorkflow).toBe(true);
    expect(ci.hasTestWorkflow).toBe(true);
    expect(ci.hasDeployWorkflow).toBe(true);
    expect(ci.hasCodeQLWorkflow).toBe(true);
  });
});
