import type { ImportantFile, RepoTree } from "../../types/github";
import { fetchRawFile } from "./githubClient";
import { IMPORTANT_FILE_ALIASES } from "../../data/auditRules";

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
  // Bundler / framework configs — every modern extension variant.
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mts",
  "vite.config.cts",
  "vite.config.mjs",
  "vite.config.cjs",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "next.config.cjs",
  "webpack.config.js",
  "webpack.config.ts",
  "webpack.config.mjs",
  "webpack.config.cjs",
  "rollup.config.js",
  "rollup.config.ts",
  "rollup.config.mjs",
  "rollup.config.cjs",
  // eslint 9 TS config + biome JSONC variant.
  "eslint.config.ts",
  "biome.jsonc",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Makefile",
  ".env.example",
  ".gitignore",
  "CHANGELOG.md",
  // Phase 7.x — fetch common alias filenames too so the changelog
  // parser, license classifier, and CODEOWNERS reader can read
  // content on repos that don't follow the modern convention.
  // The classifier's IMPORTANT_FILE_ALIASES map is the source of
  // truth; this list mirrors it for the content-fetch side.
  "History.md",
  "HISTORY.md",
  "CHANGES.md",
  "CONTRIBUTING.md",
  "Contributing.md",
  ".github/CONTRIBUTING.md",
  "docs/CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "Code-Of-Conduct.md",
  "CODE-OF-CONDUCT.md",
  ".github/CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "Security.md",
  ".github/SECURITY.md",
  "docs/SECURITY.md",
  "CODEOWNERS",
  ".github/CODEOWNERS",
  "docs/CODEOWNERS",
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
  // Case-insensitive tree-path index. GitHub paths are case-sensitive
  // on disk, but ecosystem conventions vary wildly: `License` vs
  // `LICENSE`, `Readme.md` vs `README.md`, `Makefile` vs `makefile`,
  // and so on. A case-sensitive `.has(path)` here used to silently
  // skip the actual file when its case didn't exactly match
  // TARGET_FILES — leaving the classifier with no content to parse
  // (no package.json scripts, no CODEOWNERS, no SECURITY.md body) and
  // collapsing the audit's downstream scoring on perfectly fine repos
  // like `expressjs/express`. We keep the original-cased path so the
  // raw-content fetch uses the actual filename.
  const treeLowerToPath = new Map<string, string>();
  const sizeMap = new Map<string, number | undefined>();
  for (const entry of tree.entries) {
    if (entry.type !== "blob") continue;
    treeLowerToPath.set(entry.path.toLowerCase(), entry.path);
    sizeMap.set(entry.path, entry.size);
  }

  // Build the expanded target list. Every TARGET_FILES entry contributes
  // its canonical name + every alias that the classifier recognises.
  // Without this, fetchImportantFiles would dutifully look up
  // `CHANGELOG.md` while the repo ships `History.md`, leave content
  // null, and the changelog parser would silently skip a perfectly
  // fine release log.
  const expanded = new Set<string>();
  for (const target of TARGET_FILES) {
    expanded.add(target);
    const aliases = IMPORTANT_FILE_ALIASES[target];
    if (aliases) for (const a of aliases) expanded.add(a);
  }

  // Resolve every desired filename to its actual cased path in the
  // tree. De-dupe by original path so we never fetch the same blob
  // twice when two TARGET_FILES entries resolve to the same alias.
  const candidateSet = new Set<string>();
  for (const want of expanded) {
    const actual = treeLowerToPath.get(want.toLowerCase());
    if (actual) candidateSet.add(actual);
  }
  const candidates = Array.from(candidateSet);

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
