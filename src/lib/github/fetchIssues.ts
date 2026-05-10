import { githubFetchSafe } from "./githubClient";
import type { RepoIssuesSnapshot } from "../../types/github";

interface SearchResponse {
  total_count: number;
}

export async function fetchIssuesSnapshot(
  owner: string,
  repo: string,
  openIssuesAndPRs: number,
  signal?: AbortSignal,
): Promise<RepoIssuesSnapshot> {
  const prSearch = await githubFetchSafe<SearchResponse>(
    `/search/issues?q=${encodeURIComponent(
      `repo:${owner}/${repo} is:pr is:open`,
    )}&per_page=1`,
    { signal },
  );
  const openPRCount = prSearch?.total_count ?? null;
  const openIssueCount =
    openPRCount !== null
      ? Math.max(0, openIssuesAndPRs - openPRCount)
      : openIssuesAndPRs;
  return { openIssueCount, openPRCount };
}
