import type { RepoBundle, RepoCoordinates } from "../../types/github";
import { fetchRepoMetadata } from "./fetchRepoMetadata";
import { fetchRepoTree } from "./fetchRepoTree";
import { fetchReadme } from "./fetchReadme";
import { fetchImportantFiles } from "./fetchImportantFiles";
import { fetchLanguages } from "./fetchLanguages";
import { fetchCommits } from "./fetchCommits";
import { fetchReleases } from "./fetchReleases";
import { fetchIssuesSnapshot } from "./fetchIssues";
import { fetchWorkflows } from "./fetchWorkflows";
import { GithubError } from "./githubClient";

export type LoadProgressKey =
  | "metadata"
  | "tree"
  | "languages"
  | "readme"
  | "files"
  | "workflows"
  | "commits"
  | "releases"
  | "issues";

export interface LoadOptions {
  signal?: AbortSignal;
  onProgress?: (key: LoadProgressKey) => void;
}

const MAX_TREE_ENTRIES = 60_000;

export async function loadRepoBundle(
  coords: RepoCoordinates,
  options: LoadOptions = {},
): Promise<RepoBundle> {
  const { signal, onProgress } = options;
  const tick = (key: LoadProgressKey) => onProgress && onProgress(key);

  tick("metadata");
  const metadata = await fetchRepoMetadata(coords, signal);

  if (!metadata.defaultBranch) {
    throw new GithubError("Could not read the default branch.", 422);
  }

  tick("tree");
  const tree = await fetchRepoTree(
    coords.owner,
    coords.repo,
    metadata.defaultBranch,
    signal,
  );

  if (tree.entries.length > MAX_TREE_ENTRIES) {
    tree.entries = tree.entries.slice(0, MAX_TREE_ENTRIES);
    tree.truncated = true;
  }

  tick("languages");
  const languages = await fetchLanguages(coords.owner, coords.repo, signal);

  tick("readme");
  const readme = await fetchReadme(coords.owner, coords.repo, signal);

  tick("files");
  const importantFiles = await fetchImportantFiles(
    coords.owner,
    coords.repo,
    metadata.defaultBranch,
    tree,
    signal,
  );

  tick("workflows");
  const workflows = await fetchWorkflows(coords.owner, coords.repo, signal);

  tick("commits");
  const recentCommits = await fetchCommits(
    coords.owner,
    coords.repo,
    metadata.defaultBranch,
    signal,
  );

  tick("releases");
  const releases = await fetchReleases(coords.owner, coords.repo, signal);

  tick("issues");
  const issues = await fetchIssuesSnapshot(
    coords.owner,
    coords.repo,
    metadata.openIssues,
    signal,
  );

  return {
    coords,
    metadata,
    tree,
    languages,
    readme,
    importantFiles,
    workflows,
    recentCommits,
    releases,
    issues,
  };
}

export { GithubError, RateLimitError, NotFoundError } from "./githubClient";
