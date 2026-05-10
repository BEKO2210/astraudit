import type { WorkflowInfo } from "../../types/github";
import type { ClassifiedFiles } from "./fileClassifier";

export interface CiProvider {
  id: string;
  label: string;
  files: string[];
}

export interface CiSignals {
  /** Any CI provider detected at all (GitHub Actions or otherwise). */
  hasWorkflows: boolean;
  /** Total of all detected workflow / pipeline files across providers. */
  workflowCount: number;
  /** Display names for the workflow files we discovered. */
  workflowNames: string[];
  /** Active CI providers detected from config files in the repo. */
  providers: CiProvider[];
  hasBuildWorkflow: boolean;
  hasTestWorkflow: boolean;
  hasLintWorkflow: boolean;
  hasDeployWorkflow: boolean;
  hasReleaseWorkflow: boolean;
  hasCodeQLWorkflow: boolean;
  /** True only when the project uses GitHub Actions. */
  hasGithubActions: boolean;
}

const BUILD_RE = /(build|compile|\bci\b)/i;
const TEST_RE = /(test|spec|jest|vitest|pytest|gotest)/i;
const LINT_RE = /(lint|format|prettier|eslint|biome|stylelint|rubocop|black|ruff)/i;
const DEPLOY_RE = /(deploy|publish|release|pages|gh-pages|docker|docs|netlify|vercel|cloudflare)/i;
const RELEASE_RE = /(release|changelog|tag|semantic-release)/i;
const CODEQL_RE = /(codeql|sast|security-scan|trivy|snyk)/i;

interface ProviderRule {
  id: string;
  label: string;
  files?: string[];
  folders?: string[];
}

/**
 * Provider catalog. Each entry lists the canonical file paths or folder
 * prefixes a provider uses. Detection is case-insensitive (handled by
 * classified.hasFile / hasFolder).
 */
const PROVIDER_CATALOG: ProviderRule[] = [
  {
    id: "github-actions",
    label: "GitHub Actions",
    folders: [".github/workflows"],
  },
  {
    id: "gitlab-ci",
    label: "GitLab CI",
    files: [".gitlab-ci.yml", ".gitlab-ci.yaml"],
  },
  {
    id: "circleci",
    label: "CircleCI",
    files: [".circleci/config.yml", ".circleci/config.yaml"],
  },
  {
    id: "travis",
    label: "Travis CI",
    files: [".travis.yml", ".travis.yaml"],
  },
  {
    id: "appveyor",
    label: "AppVeyor",
    files: ["appveyor.yml", ".appveyor.yml", "appveyor.yaml"],
  },
  {
    id: "azure-pipelines",
    label: "Azure Pipelines",
    files: ["azure-pipelines.yml", "azure-pipelines.yaml"],
    folders: [".azure-pipelines", ".azuredevops"],
  },
  {
    id: "jenkins",
    label: "Jenkins",
    files: ["Jenkinsfile", "Jenkinsfile.groovy"],
  },
  {
    id: "drone",
    label: "Drone CI",
    files: [".drone.yml", ".drone.yaml"],
  },
  {
    id: "woodpecker",
    label: "Woodpecker CI",
    files: [".woodpecker.yml", ".woodpecker.yaml"],
    folders: [".woodpecker"],
  },
  {
    id: "buildkite",
    label: "Buildkite",
    files: [".buildkite/pipeline.yml", ".buildkite/pipeline.yaml"],
    folders: [".buildkite"],
  },
  {
    id: "teamcity",
    label: "TeamCity",
    folders: [".teamcity"],
  },
  {
    id: "bitbucket-pipelines",
    label: "Bitbucket Pipelines",
    files: ["bitbucket-pipelines.yml", "bitbucket-pipelines.yaml"],
  },
  {
    id: "concourse",
    label: "Concourse",
    files: ["ci.yml", "pipeline.yml"],
    folders: ["ci/pipelines", "concourse"],
  },
  {
    id: "earthly",
    label: "Earthly",
    files: ["Earthfile"],
  },
  {
    id: "tekton",
    label: "Tekton",
    folders: [".tekton"],
  },
  {
    id: "harness",
    label: "Harness",
    folders: [".harness"],
  },
  {
    id: "gitea-actions",
    label: "Gitea Actions",
    folders: [".gitea/workflows"],
  },
];

/** "ci.yml" / "pipeline.yml" alone are very generic; require them to live in a CI folder. */
const STRICT_FOLDER_REQUIRED = new Set(["concourse"]);

function detectProviders(
  classified: ClassifiedFiles,
  apiWorkflows: WorkflowInfo[],
): CiProvider[] {
  const has = classified.hasFile;
  const hasFolder = classified.hasFolder;
  const detected: CiProvider[] = [];

  // GitHub Actions can be reported via the dedicated /actions/workflows
  // endpoint even when the tree was truncated and the .github/workflows/
  // entries fell outside the slice. Treat that as authoritative.
  if (apiWorkflows.length > 0) {
    detected.push({
      id: "github-actions",
      label: "GitHub Actions",
      files: apiWorkflows.slice(0, 5).map((w) => w.path),
    });
  }

  for (const rule of PROVIDER_CATALOG) {
    if (rule.id === "github-actions" && detected.some((d) => d.id === "github-actions")) {
      continue; // already handled via API workflows above
    }
    const matchedFiles: string[] = [];
    if (rule.files) {
      for (const f of rule.files) {
        const hit = has(f);
        if (hit) matchedFiles.push(hit);
      }
    }
    if (rule.folders) {
      for (const folder of rule.folders) {
        const lower = folder.toLowerCase();
        for (const path of classified.blobPathsLower.keys()) {
          if (path.startsWith(`${lower}/`)) {
            const original = classified.blobPathsLower.get(path) ?? path;
            // Only collect a few representative files per folder.
            if (matchedFiles.length < 5) matchedFiles.push(original);
          }
        }
        const folderHit = hasFolder(folder);
        if (!matchedFiles.length && folderHit && !STRICT_FOLDER_REQUIRED.has(rule.id)) {
          matchedFiles.push(`${folder}/`);
        }
      }
    }
    if (matchedFiles.length > 0) {
      detected.push({ id: rule.id, label: rule.label, files: matchedFiles });
    }
  }

  return detected;
}

export function analyzeCi(
  classified: ClassifiedFiles,
  workflows: WorkflowInfo[],
): CiSignals {
  const providers = detectProviders(classified, workflows);

  // Aggregate ALL workflow-like files across providers for keyword scanning.
  const fromApi = workflows.map((w) => ({ name: w.name, path: w.path }));
  const fromTree = classified.workflowPaths
    .filter((p) => !fromApi.find((wf) => wf.path === p))
    .map((p) => ({ name: p.split("/").pop() ?? p, path: p }));

  const otherFiles: Array<{ name: string; path: string }> = [];
  for (const provider of providers) {
    if (provider.id === "github-actions") continue;
    for (const f of provider.files) {
      otherFiles.push({ name: f.split("/").pop() ?? f, path: f });
    }
  }

  const all = [...fromApi, ...fromTree, ...otherFiles];

  const matches = (re: RegExp) =>
    all.some((wf) => re.test(wf.name) || re.test(wf.path));

  const hasGithubActions = providers.some((p) => p.id === "github-actions");
  const otherProvider = providers.some((p) => p.id !== "github-actions");

  // Heuristic: when the only detected provider is non-GitHub-Actions, we
  // can't read the keywords from the file content from a static audit, so
  // assume sensible defaults — most real CI pipelines run build + test.
  const buildKeywordHit = matches(BUILD_RE);
  const testKeywordHit = matches(TEST_RE);

  return {
    hasWorkflows: all.length > 0 || providers.length > 0,
    workflowCount: all.length,
    workflowNames: all.map((wf) => wf.name).slice(0, 30),
    providers,
    hasBuildWorkflow: buildKeywordHit || (!hasGithubActions && otherProvider),
    hasTestWorkflow: testKeywordHit || (!hasGithubActions && otherProvider),
    hasLintWorkflow: matches(LINT_RE),
    hasDeployWorkflow: matches(DEPLOY_RE),
    hasReleaseWorkflow: matches(RELEASE_RE),
    hasCodeQLWorkflow: matches(CODEQL_RE),
    hasGithubActions,
  };
}
