export interface RepoCoordinates {
  owner: string;
  repo: string;
}

export interface RepoMetadata {
  id: number;
  name: string;
  fullName: string;
  owner: {
    login: string;
    avatarUrl: string;
    htmlUrl: string;
    type: string;
  };
  description: string | null;
  homepage: string | null;
  htmlUrl: string;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  defaultBranch: string;
  language: string | null;
  topics: string[];
  license: { spdxId: string | null; name: string | null } | null;
  archived: boolean;
  disabled: boolean;
  fork: boolean;
  isTemplate: boolean;
  size: number;
  pushedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  hasWiki: boolean;
  hasPages: boolean;
  hasIssues: boolean;
  hasDiscussions: boolean;
}

export interface TreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
  size?: number;
  sha: string;
}

export interface RepoTree {
  truncated: boolean;
  entries: TreeEntry[];
}

export interface CommitInfo {
  sha: string;
  message: string;
  authorName: string | null;
  authorDate: string | null;
}

export interface ReleaseInfo {
  tagName: string;
  name: string | null;
  publishedAt: string | null;
  draft: boolean;
  prerelease: boolean;
}

export interface WorkflowInfo {
  name: string;
  path: string;
  state: string;
}

export interface LanguagesMap {
  [language: string]: number;
}

export interface RepoIssuesSnapshot {
  openIssueCount: number;
  openPRCount: number | null;
}

export interface ImportantFile {
  path: string;
  size: number | null;
  content: string | null;
  truncated?: boolean;
}

/**
 * Org-level community-health files inherited from `{owner}/.github`.
 * GitHub's UI treats these as the effective policy when the target
 * repo doesn't ship its own. Detectors fall back to these so we don't
 * report "missing SECURITY.md" on repos like `expressjs/express`.
 */
export interface OrgHealthSnapshot {
  owner: string;
  hasOrgRepo: boolean;
  securityPolicyPath: string | null;
  securityPolicyContent: string | null;
  codeOfConductPath: string | null;
  codeOfConductContent: string | null;
  contributingPath: string | null;
  contributingContent: string | null;
}

export interface RepoBundle {
  coords: RepoCoordinates;
  metadata: RepoMetadata;
  tree: RepoTree;
  languages: LanguagesMap;
  readme: ImportantFile | null;
  importantFiles: ImportantFile[];
  workflows: WorkflowInfo[];
  recentCommits: CommitInfo[];
  releases: ReleaseInfo[];
  issues: RepoIssuesSnapshot;
  orgHealth: OrgHealthSnapshot;
}
