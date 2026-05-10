import { githubFetch } from "./githubClient";
import type { RepoCoordinates, RepoMetadata } from "../../types/github";

interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  homepage: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  subscribers_count?: number;
  open_issues_count: number;
  default_branch: string;
  language: string | null;
  topics?: string[];
  license: { spdx_id: string | null; name: string | null } | null;
  archived: boolean;
  disabled: boolean;
  fork: boolean;
  is_template?: boolean;
  size: number;
  pushed_at: string | null;
  updated_at: string | null;
  created_at: string | null;
  has_wiki: boolean;
  has_pages: boolean;
  has_issues: boolean;
  has_discussions?: boolean;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
    type: string;
  };
}

export async function fetchRepoMetadata(
  coords: RepoCoordinates,
  signal?: AbortSignal,
): Promise<RepoMetadata> {
  const raw = await githubFetch<RawRepo>(
    `/repos/${coords.owner}/${coords.repo}`,
    { signal },
  );
  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    description: raw.description,
    homepage: raw.homepage,
    htmlUrl: raw.html_url,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    watchers: raw.subscribers_count ?? raw.watchers_count,
    openIssues: raw.open_issues_count,
    defaultBranch: raw.default_branch,
    language: raw.language,
    topics: raw.topics ?? [],
    license: raw.license
      ? { spdxId: raw.license.spdx_id, name: raw.license.name }
      : null,
    archived: raw.archived,
    disabled: raw.disabled,
    fork: raw.fork,
    isTemplate: raw.is_template ?? false,
    size: raw.size,
    pushedAt: raw.pushed_at,
    updatedAt: raw.updated_at,
    createdAt: raw.created_at,
    hasWiki: raw.has_wiki,
    hasPages: raw.has_pages,
    hasIssues: raw.has_issues,
    hasDiscussions: raw.has_discussions ?? false,
    owner: {
      login: raw.owner.login,
      avatarUrl: raw.owner.avatar_url,
      htmlUrl: raw.owner.html_url,
      type: raw.owner.type,
    },
  };
}
