/**
 * Live validation harness for the org-level `.github` community-health
 * fallback (the bug filed against `expressjs/express`).
 *
 * For each repo in the test list this script probes:
 *   1. Does `{owner}/{repo}` ship its OWN SECURITY.md / CODE_OF_CONDUCT.md
 *      / CONTRIBUTING.md?
 *   2. Does `{owner}/.github` ship the same files (the GitHub
 *      community-health fallback)?
 *
 * It then prints a table per file family showing where the file lives
 * (or whether it's actually missing) so we can verify Astraudit's new
 * detection mirrors what GitHub's UI reports.
 *
 * Why this script and not a unit test:
 *   - The fallback only matters in the wild; mocked trees can't catch
 *     real-world quirks (case variants, alternative paths, FUNDING-only
 *     `.github` repos, etc.).
 *   - The probe targets `raw.githubusercontent.com` (different rate
 *     limit than the REST API) so it works without a token.
 *
 * Run:
 *   npx tsx scripts/validate-org-health.ts
 *   # Optional: GITHUB_TOKEN=... for higher anon allowances
 */

import { writeFileSync } from "node:fs";

const REPOS: string[] = [
  // Top JavaScript / Node ecosystem repos — the bug was filed
  // against express, so this list disproportionately covers the
  // ecosystems most likely to centralize community-health files.
  "facebook/react",
  "vuejs/core",
  "expressjs/express",
  "lodash/lodash",
  "vitejs/vite",
  "microsoft/TypeScript",
  "denoland/deno",
  "sveltejs/svelte",
  "prettier/prettier",
  "nodejs/node",
  "axios/axios",
  "eslint/eslint",
  "webpack/webpack",
  "jestjs/jest",
  "babel/babel",
  "vercel/next.js",
  "remix-run/remix",
  "tannerlinsley/react-query",
  "reduxjs/redux",
  "facebook/jest",
  // Python ecosystem
  "django/django",
  "pallets/flask",
  "psf/requests",
  "pandas-dev/pandas",
  "numpy/numpy",
  "tiangolo/fastapi",
  "scikit-learn/scikit-learn",
  "matplotlib/matplotlib",
  // Rust
  "rust-lang/rust",
  "tokio-rs/tokio",
  "serde-rs/serde",
  "actix/actix-web",
  // Go
  "golang/go",
  "gin-gonic/gin",
  "spf13/cobra",
  "kubernetes/kubernetes",
  // Ruby
  "rails/rails",
  "ruby/ruby",
  "sinatra/sinatra",
  // Java / JVM
  "spring-projects/spring-boot",
  "elastic/elasticsearch",
  "apache/kafka",
  // Misc / DevOps / databases
  "moby/moby",
  "kubernetes/minikube",
  "redis/redis",
  "postgres/postgres",
  "git/git",
  "torvalds/linux",
  "microsoft/vscode",
  "atom/atom",
  "neovim/neovim",
  "homebrew/brew",
  "ohmyzsh/ohmyzsh",
];

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

type FileKey = "SECURITY" | "CODE_OF_CONDUCT" | "CONTRIBUTING";

const PROBES: Record<FileKey, string[]> = {
  SECURITY: [
    "SECURITY.md",
    "SECURITY.markdown",
    "SECURITY",
    ".github/SECURITY.md",
    "docs/SECURITY.md",
    "Security.md",
    "security.md",
  ],
  CODE_OF_CONDUCT: [
    "CODE_OF_CONDUCT.md",
    "CODE_OF_CONDUCT.markdown",
    "CODE_OF_CONDUCT",
    ".github/CODE_OF_CONDUCT.md",
    "docs/CODE_OF_CONDUCT.md",
    "code_of_conduct.md",
  ],
  CONTRIBUTING: [
    "CONTRIBUTING.md",
    "CONTRIBUTING.markdown",
    "CONTRIBUTING",
    ".github/CONTRIBUTING.md",
    "docs/CONTRIBUTING.md",
    "Contributing.md",
    "contributing.md",
  ],
};

async function probe(
  owner: string,
  repo: string,
  path: string,
): Promise<boolean> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`;
  const headers: Record<string, string> = { "User-Agent": "astraudit-validator/1.0" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  try {
    const res = await fetch(url, { headers, redirect: "follow" });
    return res.ok;
  } catch {
    return false;
  }
}

async function probeFirst(
  owner: string,
  repo: string,
  paths: string[],
): Promise<string | null> {
  for (const p of paths) {
    if (await probe(owner, repo, p)) return p;
  }
  return null;
}

interface RepoResult {
  fullName: string;
  /** Where the repo's own copy lives (or null if absent). */
  inRepo: Record<FileKey, string | null>;
  /** Whether `{owner}/.github` exists at all. */
  hasOrgRepo: boolean;
  /** Where the org-level fallback lives (or null). */
  inOrg: Record<FileKey, string | null>;
}

async function checkRepo(fullName: string): Promise<RepoResult> {
  const [owner, repo] = fullName.split("/");

  const inRepo: Record<FileKey, string | null> = {
    SECURITY: null,
    CODE_OF_CONDUCT: null,
    CONTRIBUTING: null,
  };
  for (const key of Object.keys(PROBES) as FileKey[]) {
    inRepo[key] = await probeFirst(owner, repo, PROBES[key]);
  }

  // Sniff whether `{owner}/.github` exists. Same heuristic the
  // production fetchOrgHealth.ts uses.
  const sniff =
    (await probe(owner, ".github", "README.md")) ||
    (await probe(owner, ".github", "SECURITY.md")) ||
    (await probe(owner, ".github", ".github/FUNDING.yml"));

  const inOrg: Record<FileKey, string | null> = {
    SECURITY: null,
    CODE_OF_CONDUCT: null,
    CONTRIBUTING: null,
  };
  if (sniff) {
    for (const key of Object.keys(PROBES) as FileKey[]) {
      inOrg[key] = await probeFirst(owner, ".github", PROBES[key]);
    }
  }

  return { fullName, inRepo, hasOrgRepo: sniff, inOrg };
}

function summarize(results: RepoResult[]): string {
  const lines: string[] = [];
  const w = (s: string, n: number) =>
    s.length >= n ? s.slice(0, n - 1) + "…" : s.padEnd(n, " ");

  lines.push("\n=== Per-repo detection table ===\n");
  lines.push(
    w("Repository", 32) +
      w("SEC.md", 14) +
      w("COC.md", 14) +
      w("CONTRIB.md", 14) +
      w("Org repo?", 12),
  );
  lines.push("-".repeat(86));

  const cell = (
    repoHit: string | null,
    orgHit: string | null,
  ): string => {
    if (repoHit) return "repo:" + (repoHit.length > 8 ? "✓" : repoHit.slice(0, 8));
    if (orgHit) return "ORG-fb";
    return "MISSING";
  };

  for (const r of results) {
    lines.push(
      w(r.fullName, 32) +
        w(cell(r.inRepo.SECURITY, r.inOrg.SECURITY), 14) +
        w(cell(r.inRepo.CODE_OF_CONDUCT, r.inOrg.CODE_OF_CONDUCT), 14) +
        w(cell(r.inRepo.CONTRIBUTING, r.inOrg.CONTRIBUTING), 14) +
        w(r.hasOrgRepo ? "yes" : "no", 12),
    );
  }
  lines.push("-".repeat(86));

  // Aggregate: how many repos rely on the org fallback for at least
  // one community-health file?
  let needFallbackForSecurity = 0;
  let needFallbackForCoc = 0;
  let needFallbackForContrib = 0;
  let totallyMissingSecurity = 0;
  let totallyMissingCoc = 0;
  let totallyMissingContrib = 0;
  for (const r of results) {
    if (!r.inRepo.SECURITY && r.inOrg.SECURITY) needFallbackForSecurity += 1;
    if (!r.inRepo.SECURITY && !r.inOrg.SECURITY) totallyMissingSecurity += 1;
    if (!r.inRepo.CODE_OF_CONDUCT && r.inOrg.CODE_OF_CONDUCT) needFallbackForCoc += 1;
    if (!r.inRepo.CODE_OF_CONDUCT && !r.inOrg.CODE_OF_CONDUCT) totallyMissingCoc += 1;
    if (!r.inRepo.CONTRIBUTING && r.inOrg.CONTRIBUTING) needFallbackForContrib += 1;
    if (!r.inRepo.CONTRIBUTING && !r.inOrg.CONTRIBUTING) totallyMissingContrib += 1;
  }

  lines.push("\n=== Org-fallback impact ===\n");
  lines.push(
    `SECURITY.md       : ${needFallbackForSecurity}/${results.length} repos need the org fallback to be classified correctly (${totallyMissingSecurity} truly missing).`,
  );
  lines.push(
    `CODE_OF_CONDUCT.md: ${needFallbackForCoc}/${results.length} repos need the org fallback to be classified correctly (${totallyMissingCoc} truly missing).`,
  );
  lines.push(
    `CONTRIBUTING.md   : ${needFallbackForContrib}/${results.length} repos need the org fallback to be classified correctly (${totallyMissingContrib} truly missing).`,
  );

  // List repos that the OLD code (no fallback) would mis-classify.
  lines.push("\n=== Pre-fix false negatives ===");
  lines.push(
    "(Repos where Astraudit USED to wrongly report a missing file because the policy lives at {owner}/.github.)\n",
  );
  for (const r of results) {
    const flips: string[] = [];
    if (!r.inRepo.SECURITY && r.inOrg.SECURITY)
      flips.push(`SECURITY.md (${r.inOrg.SECURITY})`);
    if (!r.inRepo.CODE_OF_CONDUCT && r.inOrg.CODE_OF_CONDUCT)
      flips.push(`CODE_OF_CONDUCT.md (${r.inOrg.CODE_OF_CONDUCT})`);
    if (!r.inRepo.CONTRIBUTING && r.inOrg.CONTRIBUTING)
      flips.push(`CONTRIBUTING.md (${r.inOrg.CONTRIBUTING})`);
    if (flips.length > 0) {
      lines.push(`• ${r.fullName}:`);
      for (const f of flips) lines.push(`    – was missing → now found: ${f}`);
    }
  }

  return lines.join("\n");
}

async function main(): Promise<void> {
  console.log(
    `Astraudit org-health validation — ${REPOS.length} repositories\n`,
  );
  if (TOKEN) console.log("Using GITHUB_TOKEN.");

  const results: RepoResult[] = [];
  let i = 0;
  for (const fullName of REPOS) {
    i += 1;
    process.stdout.write(`[${i}/${REPOS.length}] ${fullName}... `);
    try {
      const r = await checkRepo(fullName);
      results.push(r);
      const repoHits = Object.values(r.inRepo).filter(Boolean).length;
      const orgHits = Object.values(r.inOrg).filter(Boolean).length;
      console.log(
        `repo:${repoHits}/3 · org:${orgHits}/3 · org-repo:${
          r.hasOrgRepo ? "yes" : "no"
        }`,
      );
    } catch (err) {
      console.log(`FAILED — ${(err as Error).message}`);
    }
  }

  const report = summarize(results);
  console.log(report);

  // Persist to disk so the user can re-read without re-fetching.
  const outPath = `${process.cwd()}/.audit-cache/org-health-validation.txt`;
  try {
    writeFileSync(outPath, report);
    console.log(`\nReport written to ${outPath}`);
  } catch {
    // best-effort; if .audit-cache/ doesn't exist we just skip.
  }
}

main().catch((err) => {
  console.error("Validator crashed:", err);
  process.exit(1);
});
