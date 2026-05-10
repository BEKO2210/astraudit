import { githubFetch, GithubError } from "./githubClient";
import type { RepoTree, TreeEntry } from "../../types/github";

interface RawTree {
  sha: string;
  url: string;
  truncated: boolean;
  tree: Array<{
    path: string;
    type: "blob" | "tree" | "commit";
    sha: string;
    size?: number;
  }>;
}

export async function fetchRepoTree(
  owner: string,
  repo: string,
  branch: string,
  signal?: AbortSignal,
): Promise<RepoTree> {
  try {
    const raw = await githubFetch<RawTree>(
      `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      { signal },
    );
    const entries: TreeEntry[] = raw.tree.map((item) => ({
      path: item.path,
      type: item.type,
      sha: item.sha,
      size: item.size,
    }));
    return { truncated: raw.truncated, entries };
  } catch (err) {
    if (err instanceof GithubError && err.status === 409) {
      return { truncated: false, entries: [] };
    }
    throw err;
  }
}
