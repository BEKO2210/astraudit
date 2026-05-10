import type {
  CommitInfo,
  ImportantFile,
  LanguagesMap,
  ReleaseInfo,
  RepoBundle,
  RepoIssuesSnapshot,
  RepoMetadata,
  RepoTree,
  TreeEntry,
  WorkflowInfo,
} from "../../src/types/github";

export interface TreeOptions {
  truncated?: boolean;
}

/**
 * Build a synthetic RepoTree from a list of paths. Any path containing
 * a "/" creates the implied parent tree entries automatically. Paths
 * ending in "/" are treated as directories.
 */
export function makeTree(paths: string[], opts: TreeOptions = {}): RepoTree {
  const seen = new Set<string>();
  const entries: TreeEntry[] = [];

  for (const raw of paths) {
    const isDir = raw.endsWith("/");
    const path = isDir ? raw.slice(0, -1) : raw;
    const segments = path.split("/").filter(Boolean);

    for (let i = 1; i < segments.length; i++) {
      const dirPath = segments.slice(0, i).join("/");
      if (!seen.has(`tree:${dirPath}`)) {
        seen.add(`tree:${dirPath}`);
        entries.push({ path: dirPath, type: "tree", sha: `sha-${dirPath}` });
      }
    }

    if (isDir) {
      const dirPath = segments.join("/");
      if (!seen.has(`tree:${dirPath}`)) {
        seen.add(`tree:${dirPath}`);
        entries.push({ path: dirPath, type: "tree", sha: `sha-${dirPath}` });
      }
    } else {
      const filePath = segments.join("/");
      if (!seen.has(`blob:${filePath}`)) {
        seen.add(`blob:${filePath}`);
        entries.push({
          path: filePath,
          type: "blob",
          sha: `sha-${filePath}`,
          size: 100,
        });
      }
    }
  }

  return { truncated: !!opts.truncated, entries };
}

export function makeImportantFiles(
  contents: Record<string, string | null>,
): ImportantFile[] {
  return Object.entries(contents).map(([path, content]) => ({
    path,
    size: content ? content.length : 0,
    content,
  }));
}

const DEFAULT_METADATA: RepoMetadata = {
  id: 1,
  name: "demo",
  fullName: "owner/demo",
  description: "A demo repository.",
  homepage: null,
  htmlUrl: "https://github.com/owner/demo",
  stars: 42,
  forks: 3,
  watchers: 5,
  openIssues: 2,
  defaultBranch: "main",
  language: "TypeScript",
  topics: [],
  license: { spdxId: "MIT", name: "MIT License" },
  archived: false,
  disabled: false,
  fork: false,
  isTemplate: false,
  size: 1000,
  pushedAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  updatedAt: new Date().toISOString(),
  createdAt: new Date(Date.now() - 365 * 86_400_000).toISOString(),
  hasWiki: false,
  hasPages: false,
  hasIssues: true,
  hasDiscussions: false,
  owner: {
    login: "owner",
    avatarUrl: "https://avatars.example/owner",
    htmlUrl: "https://github.com/owner",
    type: "User",
  },
};

export function makeMetadata(overrides: Partial<RepoMetadata> = {}): RepoMetadata {
  return { ...DEFAULT_METADATA, ...overrides };
}

export interface BundleOptions {
  paths?: string[];
  importantFiles?: Record<string, string | null>;
  metadata?: Partial<RepoMetadata>;
  languages?: LanguagesMap;
  workflows?: WorkflowInfo[];
  recentCommits?: CommitInfo[];
  releases?: ReleaseInfo[];
  issues?: RepoIssuesSnapshot;
  readmeContent?: string | null;
  treeTruncated?: boolean;
}

export function makeBundle(opts: BundleOptions = {}): RepoBundle {
  const tree = makeTree(opts.paths ?? [], { truncated: opts.treeTruncated });
  const importantFiles = makeImportantFiles(opts.importantFiles ?? {});
  const metadata = makeMetadata(opts.metadata);
  return {
    coords: { owner: metadata.owner.login, repo: metadata.name },
    metadata,
    tree,
    languages: opts.languages ?? { TypeScript: 80_000, JavaScript: 20_000 },
    readme:
      opts.readmeContent !== undefined
        ? { path: "README.md", size: opts.readmeContent?.length ?? 0, content: opts.readmeContent }
        : null,
    importantFiles,
    workflows: opts.workflows ?? [],
    recentCommits: opts.recentCommits ?? [],
    releases: opts.releases ?? [],
    issues: opts.issues ?? { openIssueCount: 1, openPRCount: 0 },
  };
}
