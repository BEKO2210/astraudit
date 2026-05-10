import type { RepoBundle, RepoCoordinates } from "../../types/github";
import { fetchRepoMetadata } from "./fetchRepoMetadata";
import { fetchRepoTree } from "./fetchRepoTree";
import { fetchReadme } from "./fetchReadme";
import { fetchImportantFiles } from "./fetchImportantFiles";
import { fetchOrgHealth } from "./fetchOrgHealth";
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
  /**
   * Optional GitHub PAT scoped to this single audit. Threaded into
   * `process.env.GITHUB_TOKEN` for the duration of the call so every
   * sub-fetcher's `loadToken()` picks it up, then restored. Used by
   * the MCP server / CLI so the caller can pass a token per request
   * without touching the user's shell environment.
   *
   * The browser path leaves this undefined (the SPA reads its token
   * from localStorage via the Settings dialog).
   */
  token?: string | null;
}

const MAX_TREE_ENTRIES = 60_000;

export async function loadRepoBundle(
  coords: RepoCoordinates,
  options: LoadOptions = {},
): Promise<RepoBundle> {
  const { signal, onProgress, token } = options;

  // Phase 6.x — token plumbing for the MCP server / CLI path.
  // The fetchers all read the active token via `loadToken()` which,
  // outside the browser, returns `process.env.GITHUB_TOKEN`. We
  // temporarily set the env var here so a per-call token scopes
  // correctly, then restore the previous value on the way out
  // (so two concurrent loadRepoBundle calls don't trample each
  // other — they shouldn't run concurrently in MCP, but defensive).
  const restoreToken =
    token != null && typeof process !== "undefined"
      ? (() => {
          const previous = process.env.GITHUB_TOKEN;
          process.env.GITHUB_TOKEN = token;
          return () => {
            if (previous === undefined) delete process.env.GITHUB_TOKEN;
            else process.env.GITHUB_TOKEN = previous;
          };
        })()
      : () => {};

  try {
    return await loadRepoBundleInner(coords, signal, onProgress);
  } finally {
    restoreToken();
  }
}

async function loadRepoBundleInner(
  coords: RepoCoordinates,
  signal: AbortSignal | undefined,
  onProgress: ((key: LoadProgressKey) => void) | undefined,
): Promise<RepoBundle> {
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

  // Org-level community-health probe. We deliberately run this AFTER
  // the per-repo file fetch so the per-repo path always wins when both
  // are present; the org probe is a *fallback*, not a merge. Its
  // failures are silent (network blips just mean no fallback this run).
  const orgHealth = await fetchOrgHealth(coords.owner, signal);

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
    orgHealth,
  };
}

export { GithubError, RateLimitError, NotFoundError } from "./githubClient";
