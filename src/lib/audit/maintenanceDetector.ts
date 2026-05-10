import type { RepoBundle } from "../../types/github";

export interface MaintenanceSignals {
  pushedAt: string | null;
  daysSincePush: number | null;
  releasesCount: number;
  latestRelease: string | null;
  latestReleasePublishedAt: string | null;
  topicsCount: number;
  hasDescription: boolean;
  hasHomepage: boolean;
  archived: boolean;
  fork: boolean;
  openIssues: number;
  openPRs: number | null;
  recentCommitCount: number;
}

export function analyzeMaintenance(bundle: RepoBundle): MaintenanceSignals {
  const pushedAt = bundle.metadata.pushedAt;
  const daysSincePush = pushedAt
    ? Math.max(
        0,
        Math.round((Date.now() - new Date(pushedAt).getTime()) / 86_400_000),
      )
    : null;

  const latest = bundle.releases.find((r) => !r.draft && !r.prerelease) ?? bundle.releases[0];

  return {
    pushedAt,
    daysSincePush,
    releasesCount: bundle.releases.length,
    latestRelease: latest?.tagName ?? null,
    latestReleasePublishedAt: latest?.publishedAt ?? null,
    topicsCount: bundle.metadata.topics.length,
    hasDescription: !!bundle.metadata.description?.trim(),
    hasHomepage: !!bundle.metadata.homepage?.trim(),
    archived: bundle.metadata.archived,
    fork: bundle.metadata.fork,
    openIssues: bundle.issues.openIssueCount,
    openPRs: bundle.issues.openPRCount,
    recentCommitCount: bundle.recentCommits.length,
  };
}
