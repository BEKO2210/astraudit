import { githubFetchSafe } from "./githubClient";
import type { ReleaseInfo } from "../../types/github";

interface RawRelease {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
}

export async function fetchReleases(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<ReleaseInfo[]> {
  const data = await githubFetchSafe<RawRelease[]>(
    `/repos/${owner}/${repo}/releases?per_page=10`,
    { signal },
  );
  if (!data) return [];
  return data.map((r) => ({
    tagName: r.tag_name,
    name: r.name,
    publishedAt: r.published_at,
    draft: r.draft,
    prerelease: r.prerelease,
  }));
}
