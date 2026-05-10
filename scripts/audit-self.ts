/**
 * Run Astraudit's own engine against the local repo.
 *
 * Builds a `RepoBundle` from the filesystem (no network), runs
 * `runAudit`, and prints the per-category score breakdown so we
 * know exactly where we sit before / after each meta-file pass.
 *
 * NOT a substitute for auditing the deployed repo via the GitHub
 * REST API — repository metadata that lives outside the working
 * tree (description, topics, stars, push date, default branch
 * name, etc.) is approximated here. The categories that depend
 * primarily on the file tree (Documentation, Structure, Code
 * Quality Signals, Security & Trust, Developer Experience,
 * Ecosystem & Dependencies, CI/CD) ARE accurate.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

import { runAudit } from "../src/lib/audit/auditEngine";
import type {
  ImportantFile,
  RepoBundle,
  RepoTree,
  TreeEntry,
} from "../src/types/github";

const ROOT = resolve(process.cwd());
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "playwright-report",
  "test-results",
  ".audit-cache",
  ".lighthouseci",
]);

function walk(dir: string, out: TreeEntry[] = []): TreeEntry[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push({ path: rel, type: "tree", sha: "" });
      walk(full, out);
    } else if (st.isFile()) {
      out.push({
        path: rel,
        type: "blob",
        size: st.size,
        sha: "",
      });
    }
  }
  return out;
}

function readImportantFile(path: string): ImportantFile | null {
  const full = join(ROOT, path);
  if (!existsSync(full)) return null;
  const st = statSync(full);
  const content = readFileSync(full, "utf8");
  return { path, size: st.size, content, truncated: false };
}

const TARGETS = [
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "Dockerfile",
  ".env.example",
  ".gitignore",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "LICENSE",
  ".github/CODEOWNERS",
  ".github/dependabot.yml",
];

function gitOrFallback(args: string[], fallback: string): string {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

function buildLocalBundle(): RepoBundle {
  const entries = walk(ROOT);
  const tree: RepoTree = { truncated: false, entries };

  const importantFiles = TARGETS.map(readImportantFile).filter(
    (f): f is ImportantFile => f !== null,
  );

  const readme = readImportantFile("README.md");

  const workflowDir = join(ROOT, ".github/workflows");
  const workflows = existsSync(workflowDir)
    ? readdirSync(workflowDir).map((f) => ({
        name: f.replace(/\.ya?ml$/, ""),
        path: `.github/workflows/${f}`,
        state: "active",
      }))
    : [];

  // Crude commit / language mocks. Good enough for the categories
  // that depend on file-tree signals; Maintenance category will be
  // approximate but not zero.
  const recentCommits = gitOrFallback(
    ["log", "-30", "--pretty=format:%H%an%aI%s"],
    "",
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, authorName, authorDate, ...rest] = line.split("");
      return {
        sha,
        message: rest.join(""),
        authorName,
        authorDate,
      };
    });

  const branchName = gitOrFallback(["rev-parse", "--abbrev-ref", "HEAD"], "main");

  return {
    coords: { owner: "BEKO2210", repo: "astraudit" },
    metadata: {
      id: 1,
      fullName: "BEKO2210/astraudit",
      name: "astraudit",
      owner: {
        login: "BEKO2210",
        avatarUrl: "",
        htmlUrl: "https://github.com/BEKO2210",
        type: "User",
      },
      description:
        "Astraudit maps, scores, and explains public GitHub repositories.",
      homepage: "https://beko2210.github.io/astraudit/",
      htmlUrl: "https://github.com/BEKO2210/astraudit",
      stars: 0,
      forks: 0,
      watchers: 0,
      openIssues: 0,
      defaultBranch: branchName === "HEAD" ? "main" : branchName,
      language: "TypeScript",
      topics: [
        "typescript",
        "react",
        "vite",
        "tailwindcss",
        "github",
        "audit",
        "browser-only",
      ],
      license: { spdxId: "MIT", name: "MIT License" },
      archived: false,
      disabled: false,
      fork: false,
      isTemplate: false,
      size: 0,
      pushedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      hasWiki: false,
      hasPages: true,
      hasIssues: true,
      hasDiscussions: false,
    },
    tree,
    languages: { TypeScript: 800_000, CSS: 60_000, HTML: 6_000 },
    readme,
    importantFiles,
    workflows,
    recentCommits,
    releases: [],
    issues: { openIssueCount: 0, openPRCount: 0 },
    orgHealth: {
      owner: "BEKO2210",
      hasOrgRepo: false,
      securityPolicyPath: null,
      securityPolicyContent: null,
      codeOfConductPath: null,
      codeOfConductContent: null,
      contributingPath: null,
      contributingContent: null,
    },
  };
}

function bar(score: number, max: number, width = 24): string {
  const filled = Math.round((score / max) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function main(): void {
  const bundle = buildLocalBundle();
  const result = runAudit(bundle);

  console.log("\n=== Astraudit auditing itself ===\n");
  console.log(
    `${result.bundle.metadata.fullName}  ·  ${result.totalScore} / ${result.maxScore}  ·  Grade: ${result.grade}`,
  );
  console.log(`Headline: ${result.headline}`);
  console.log(`Verdict:  ${result.verdict}\n`);

  console.log("Category breakdown");
  console.log("──────────────────");
  for (const c of result.categories) {
    const pct = Math.round((c.score / c.max) * 100);
    console.log(
      `${bar(c.score, c.max)}  ${c.score.toString().padStart(2)}/${c.max
        .toString()
        .padStart(2)}  ${pct.toString().padStart(3)}%  ${c.label}  (${c.status})`,
    );
  }

  console.log(`\nFindings: ${result.findings.length}`);
  for (const f of result.findings.slice(0, 10)) {
    console.log(
      `  [${f.severity.padEnd(8)}] ${f.title} — ${f.recommendation ?? ""}`,
    );
  }

  console.log(`\nRecommendations: ${result.recommendations.length}`);
  for (const r of result.recommendations) {
    console.log(`  ${r.impact.padEnd(6)}  ${r.title}`);
  }
}

main();
