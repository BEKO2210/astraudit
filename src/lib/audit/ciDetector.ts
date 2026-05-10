import type { WorkflowInfo } from "../../types/github";
import type { ClassifiedFiles } from "./fileClassifier";

export interface CiSignals {
  hasWorkflows: boolean;
  workflowCount: number;
  workflowNames: string[];
  hasBuildWorkflow: boolean;
  hasTestWorkflow: boolean;
  hasLintWorkflow: boolean;
  hasDeployWorkflow: boolean;
  hasReleaseWorkflow: boolean;
  hasCodeQLWorkflow: boolean;
}

const BUILD_RE = /(build|compile|ci)/i;
const TEST_RE = /(test|spec|jest|vitest)/i;
const LINT_RE = /(lint|format|prettier|eslint|biome)/i;
const DEPLOY_RE = /(deploy|publish|release|pages|gh-pages|docker|docs)/i;
const RELEASE_RE = /(release|changelog|tag)/i;
const CODEQL_RE = /(codeql)/i;

export function analyzeCi(
  classified: ClassifiedFiles,
  workflows: WorkflowInfo[],
): CiSignals {
  const fromApi = workflows.map((w) => ({
    name: w.name,
    path: w.path,
  }));
  const fromTree = classified.workflowPaths
    .filter((p) => !fromApi.find((wf) => wf.path === p))
    .map((p) => ({
      name: p.split("/").pop() ?? p,
      path: p,
    }));
  const all = [...fromApi, ...fromTree];

  const matches = (re: RegExp) =>
    all.some((wf) => re.test(wf.name) || re.test(wf.path));

  return {
    hasWorkflows: all.length > 0,
    workflowCount: all.length,
    workflowNames: all.map((wf) => wf.name).slice(0, 30),
    hasBuildWorkflow: matches(BUILD_RE),
    hasTestWorkflow: matches(TEST_RE),
    hasLintWorkflow: matches(LINT_RE),
    hasDeployWorkflow: matches(DEPLOY_RE),
    hasReleaseWorkflow: matches(RELEASE_RE),
    hasCodeQLWorkflow: matches(CODEQL_RE),
  };
}
