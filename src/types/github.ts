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
}
