import type { ImportantFile, RepoTree } from "../../types/github";
import { fetchRawFile } from "./githubClient";

const MAX_FILE_BYTES = 250_000;

const TARGET_FILES = [
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "composer.json",
  "Gemfile",
  "deno.json",
  "turbo.json",
  "nx.json",
  "biome.json",
  ".eslintrc",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.json",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.js",
  "prettier.config.js",
  "vite.config.ts",
  "vite.config.js",
  "next.config.js",
  "next.config.mjs",
  "webpack.config.js",
  "rollup.config.js",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Makefile",
  ".env.example",
  ".gitignore",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "CODEOWNERS",
  ".github/CODEOWNERS",
  ".github/dependabot.yml",
  ".github/dependabot.yaml",
];

export async function fetchImportantFiles(
  owner: string,
  repo: string,
  branch: string,
  tree: RepoTree,
  signal?: AbortSignal,
): Promise<ImportantFile[]> {
  const treePathSet = new Set(
    tree.entries.filter((e) => e.type === "blob").map((e) => e.path),
  );
  const sizeMap = new Map<string, number | undefined>();
  for (const entry of tree.entries) {
    if (entry.type === "blob") sizeMap.set(entry.path, entry.size);
  }

  const candidates = TARGET_FILES.filter((path) => treePathSet.has(path));

  const results: ImportantFile[] = [];
  const fetchOne = async (path: string): Promise<void> => {
    const size = sizeMap.get(path) ?? null;
    if (size !== null && size > MAX_FILE_BYTES) {
      results.push({ path, size, content: null, truncated: true });
      return;
    }
    const content = await fetchRawFile(owner, repo, branch, path, signal);
    results.push({ path, size, content, truncated: false });
  };

  const BATCH = 4;
  for (let i = 0; i < candidates.length; i += BATCH) {
    const slice = candidates.slice(i, i + BATCH);
    await Promise.all(slice.map(fetchOne));
  }

  return results;
}
