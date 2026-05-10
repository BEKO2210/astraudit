import { githubFetchSafe } from "./githubClient";
import type { CommitInfo } from "../../types/github";

interface RawCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string | null; date: string | null } | null;
  };
}

export async function fetchCommits(
  owner: string,
  repo: string,
  branch: string,
  signal?: AbortSignal,
): Promise<CommitInfo[]> {
  // 100 is the GitHub API max for a single page. We already pay for
  // one network round-trip; bumping the page size widens the activity
  // heatmap window without adding API cost.
  const data = await githubFetchSafe<RawCommit[]>(
    `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=100`,
    { signal },
  );
  if (!data) return [];
  return data.map((c) => ({
    sha: c.sha,
    message: (c.commit?.message ?? "").split("\n")[0].slice(0, 240),
    authorName: c.commit?.author?.name ?? null,
    authorDate: c.commit?.author?.date ?? null,
  }));
}
