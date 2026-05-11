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

/**
 * Phase 7.0.3 — default-branch protection probe.
 *
 * The `/repos/{owner}/{repo}/branches/{branch}/protection` endpoint
 * is gated to repo admin tokens. A browser-only audit running
 * unauthenticated (or with a visitor's `public_repo` PAT) gets 404
 * back either when (a) no protection is configured, OR (b) the
 * caller can't read protection. We can't distinguish (a) from (b)
 * from the public surface — both collapse to `"unknown"`.
 *
 * When the probe DOES succeed (admin-token audit), `status` is
 * `"observed"` and the carried fields summarise what the public
 * surface revealed. The audit never invents a "no required reviews"
 * finding from absence of evidence — that's the whole point of
 * 7.0.3.
 */
export type BranchProtectionSignals =
  | {
      status: "observed";
      branch: string;
      requiredReviews: number | null;
      requiredStatusChecks: boolean;
      enforceAdmins: boolean;
      requireLinearHistory: boolean;
      allowForcePushes: boolean;
      allowDeletions: boolean;
    }
  | { status: "unknown"; branch: string; reason: "gated" | "not-set" | "error" };

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
  /**
   * Phase 7.0.3 — branch protection probe. Always populated (never
   * undefined) so downstream consumers can pattern-match
   * `signals.status === "observed"` without a presence guard. The
   * default value is `{ status: "unknown", reason: "gated" }` for
   * any audit where the endpoint returned 403/404.
   */
  branchProtection: BranchProtectionSignals;
}
