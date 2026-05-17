#!/usr/bin/env tsx
/**
 * Multi-repo honesty audit. For each target repo, runs the same
 * pipeline the dashboard runs and compares every "we said X about
 * this file" claim against the actual file tree (+ org-level
 * `.github` fallback). Any mismatch is a lie we tell users.
 *
 * Usage:
 *   GITHUB_TOKEN=... npx tsx scripts/honesty-check.ts          # default 12-repo sweep
 *   GITHUB_TOKEN=... npx tsx scripts/honesty-check.ts owner/repo
 *
 * Token-bearing because unauthenticated GitHub caps us at 60 req/h
 * and one audit fires ~10 requests.
 */

import { loadRepoBundle } from "../src/lib/github/index";
import { runAudit } from "../src/lib/audit/auditEngine";
import { parseRepoInput } from "../src/lib/github/parseRepoInput";
import {
  RateLimitError,
  probeRateLimit,
} from "../src/lib/github/githubClient";

/**
 * Approximate per-repo API budget. Each `loadRepoBundle` call fires
 * roughly this many requests against api.github.com (metadata, tree,
 * readme, important-files, languages, commits, releases, issues,
 * org-health-fallback, branch-protection). Used by the pre-flight
 * budget check + the post-failure comment so the maintainer can see
 * "we needed X, had Y" instead of a generic 403.
 */
const APPROX_CALLS_PER_REPO = 10;

/**
 * Phase 7.0.7 — multi-stack honesty sweep. The target list grew
 * from 31 → 56 repos, deliberately covering every supported
 * ecosystem so the CI gate catches stack-specific regressions
 * (Reddit's original critique was JS-centric noise on non-JS
 * stacks). Each repo is curated: a well-maintained, popular,
 * representative project from its ecosystem so any "we said X but
 * truth is Y" delta points at a real bug.
 */
const DEFAULT_TARGETS = [
  // ---- JS / TS ecosystem (15) ----
  "expressjs/express",
  "facebook/react",
  "vuejs/core",
  "vitejs/vite",
  "lodash/lodash",
  "microsoft/TypeScript",
  "denoland/deno",
  "sveltejs/svelte",
  "prettier/prettier",
  "nodejs/node",
  "axios/axios",
  "tailwindlabs/tailwindcss",
  "remix-run/react-router",
  "webpack/webpack",
  "rollup/rollup",
  // ---- Python (8) ----
  "django/django",
  "pallets/flask",
  "psf/requests",
  "fastapi/fastapi",
  "pandas-dev/pandas",
  "pytest-dev/pytest",
  "scikit-learn/scikit-learn",
  "pypa/pip",
  // ---- Rust (7) ----
  "rust-lang/rust",
  "tokio-rs/tokio",
  "BurntSushi/ripgrep",
  "rust-lang/cargo",
  "serde-rs/serde",
  "clap-rs/clap",
  "rayon-rs/rayon",
  // ---- Go (8) ----
  "golang/go",
  "kubernetes/kubernetes",
  "gin-gonic/gin",
  "spf13/cobra",
  "cli/cli",
  "hashicorp/terraform",
  "prometheus/prometheus",
  "grpc/grpc-go",
  // ---- Ruby (4) ----
  "rails/rails",
  "ruby/ruby",
  "fastlane/fastlane",
  "rubocop/rubocop",
  // ---- PHP / Composer (3) ----
  "laravel/framework",
  "symfony/symfony",
  "composer/composer",
  // ---- Java / JVM (3) ----
  "spring-projects/spring-boot",
  "elastic/elasticsearch",
  "apache/kafka",
  // ---- Swift / iOS (2) ----
  "apple/swift",
  "Alamofire/Alamofire",
  // ---- C / C++ / system (3) ----
  "torvalds/linux",
  "git/git",
  "redis/redis",
  // ---- Astraudit itself (eat your own dog food) ----
  "BEKO2210/astraudit",
];

interface Verdict {
  repo: string;
  ok: boolean;
  lies: string[];
  notes: string[];
}

function existsByPattern(
  files: string[],
  patterns: RegExp[],
): boolean {
  return files.some((f) => patterns.some((p) => p.test(f)));
}

async function audit(target: string): Promise<Verdict> {
  const parsed = parseRepoInput(target);
  if (!parsed.ok || !parsed.coords) {
    return { repo: target, ok: false, lies: ["bad repo input"], notes: [] };
  }
  const bundle = await loadRepoBundle(parsed.coords);
  const result = runAudit(bundle);

  const tree = bundle.tree.entries
    .filter((e) => e.type === "blob")
    .map((e) => e.path);
  const rootFiles = tree.filter((p) => !p.includes("/"));
  const dotGithub = tree.filter((p) => p.startsWith(".github/"));
  const oh = bundle.orgHealth;

  // Ground-truth booleans derived from the actual file tree.
  const truthLicense = existsByPattern(rootFiles, [
    /^licen[sc]e(\.|$)/i,
    /^copying(\.|$)/i,
    /^copyright(\.|$)/i,
  ]);
  const truthCoC = existsByPattern(rootFiles.concat(dotGithub), [
    /code[-_ ]of[-_ ]conduct/i,
  ]) || !!oh?.codeOfConductPath;
  const truthContributing = existsByPattern(rootFiles.concat(dotGithub), [
    /^contributing/i,
    /\/contributing/i,
  ]) || !!oh?.contributingPath;
  const truthSecurity = existsByPattern(rootFiles.concat(dotGithub), [
    /^security/i,
    /\/security/i,
  ]) || !!oh?.securityPolicyPath;
  // Phase 7.0.7 follow-up — the previous heuristic matched any path
  // under `.github/` whose filename ENDS in `dependabot.yml`, which
  // false-positives on workflow files like
  // `.github/workflows/automerge-dependabot.yml` (a workflow that
  // merges Dependabot's PRs, not a Dependabot v2 config). Dependabot
  // only reads `.github/dependabot.yml` or `.github/dependabot.yaml`
  // — anchor the check to those exact paths so the truth signal
  // matches the actual ground truth (and the detector's contract).
  const truthDependabot = dotGithub.some(
    (f) => f === ".github/dependabot.yml" || f === ".github/dependabot.yaml",
  );
  const truthChangelog = existsByPattern(rootFiles, [
    /^changelog(\.|$)/i,
    /^history(\.|$)/i,
    /^changes(\.|$)/i,
    /^news(\.|$)/i,
    /^releases(\.|$)/i,
  ]);
  const truthReadme = !!(bundle.readme && bundle.readme.content && bundle.readme.content.length > 0);

  // What we claim — derived from the audit's findings + score categories.
  const titles = result.findings.map((f) => f.title.toLowerCase());
  const weClaim = {
    license: !titles.some((t) => /no license/.test(t)),
    coc: result.findings.every((f) => !/code.of.conduct/i.test(f.title)),
    contributing: !titles.some((t) => /no contributing/.test(t)),
    security: !titles.some((t) => /no security/.test(t)),
    dependabot: !titles.some((t) => /no (dependency|dependabot)/.test(t)),
    readme: !titles.some((t) => /no readme/.test(t)),
  };

  const lies: string[] = [];
  const cmp = (label: string, weSay: boolean, truth: boolean) => {
    if (weSay !== truth) {
      lies.push(`  ${label}: we_said=${weSay} truth=${truth}`);
    }
  };
  cmp("LICENSE", weClaim.license, truthLicense);
  cmp("CONTRIBUTING (incl. org-fallback)", weClaim.contributing, truthContributing);
  cmp("SECURITY (incl. org-fallback)", weClaim.security, truthSecurity);
  cmp("Dependabot", weClaim.dependabot, truthDependabot);
  cmp("README content fetched", weClaim.readme, truthReadme);
  // Code-of-Conduct + Changelog are info-only signals (no missing
  // finding emitted), so we don't lie about them — just note state.

  const notes = [
    `  files@root=${rootFiles.length} files@.github=${dotGithub.length} orgRepo=${oh?.hasOrgRepo ?? false}`,
    `  license=${truthLicense} contrib=${truthContributing}(org=${!!oh?.contributingPath}) coc=${truthCoC}(org=${!!oh?.codeOfConductPath}) sec=${truthSecurity}(org=${!!oh?.securityPolicyPath}) dep=${truthDependabot} cl=${truthChangelog} rdme=${truthReadme}`,
    `  score=${result.totalScore}/${result.maxScore} findings=${result.findings.length}`,
  ];
  return { repo: target, ok: lies.length === 0, lies, notes };
}

/**
 * Phase 7.0.7 — JSON summary mode for the CI gate.
 *
 * When the script is invoked with `--json`, it emits a single JSON
 * blob on stdout (plus the per-repo summary on stderr so the log
 * is still readable). The CI workflow uses the JSON to compute the
 * lie-count delta versus `main` and posts a PR comment.
 */
interface Summary {
  total_repos: number;
  total_lies: number;
  lies_per_repo: Array<{ repo: string; lies: number; details: string[] }>;
  errors: Array<{ repo: string; message: string }>;
  /**
   * True when the sweep stopped early because the GitHub token's
   * rate-limit window was exhausted. The downstream workflow uses
   * this to render an explanatory PR comment AND skip the
   * block-on-new-lies merge gate — a rate-limited run produces no
   * trustworthy signal, so blocking on it would be a false positive.
   */
  rate_limited: boolean;
  /**
   * Detail for the comment when rate_limited=true. Includes how many
   * repos got swept before the limit, plus the seconds until the
   * window resets so the maintainer can decide between "wait + rerun"
   * vs "merge anyway".
   */
  rate_limit_detail?: {
    repos_swept: number;
    repos_total: number;
    reset_in_seconds: number | null;
  };
}

function buildSummary(
  verdicts: Verdict[],
  rateLimit?: Summary["rate_limit_detail"],
): Summary {
  let totalLies = 0;
  const lies_per_repo: Summary["lies_per_repo"] = [];
  const errors: Summary["errors"] = [];
  for (const v of verdicts) {
    const errorLies = v.lies.filter((l) => l.startsWith("error:"));
    if (errorLies.length > 0) {
      errors.push({ repo: v.repo, message: errorLies[0].slice("error:".length).trim() });
      continue;
    }
    if (v.lies.length > 0) {
      lies_per_repo.push({ repo: v.repo, lies: v.lies.length, details: v.lies });
      totalLies += v.lies.length;
    }
  }
  return {
    total_repos: verdicts.length,
    total_lies: totalLies,
    lies_per_repo,
    errors,
    rate_limited: !!rateLimit,
    ...(rateLimit ? { rate_limit_detail: rateLimit } : {}),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const repoArg = args.find((a) => !a.startsWith("--"));
  const targets = repoArg ? [repoArg] : DEFAULT_TARGETS;
  const log = jsonMode
    ? (msg: string) => process.stderr.write(msg + "\n")
    : (msg: string) => console.log(msg);

  // Pre-flight rate-limit probe. Honesty.yml currently runs two
  // sweeps per PR (head + base) and each sweep is ~targets × 10
  // calls. With a 1000/h token budget that single workflow can
  // saturate the window when several PRs land in quick succession,
  // which is exactly what produced the recurring rate-limit failure
  // on PRs #103–#105.
  //
  // If we already know we don't have enough budget, fail fast with a
  // structured "rate_limited" JSON payload so the workflow can post
  // a useful comment instead of letting 56 individual 403s thrash.
  const needed = targets.length * APPROX_CALLS_PER_REPO;
  const probe = await probeRateLimit();
  if (probe) {
    log(
      `Token budget: ${probe.remaining}/${probe.limit} remaining, ` +
        `${probe.used} used, resets in ${probe.resetSeconds}s. ` +
        `Need ~${needed} for this sweep.`,
    );
    if (probe.remaining < needed) {
      log(
        `× Skipping sweep: budget too low (${probe.remaining} remaining, ${needed} needed).`,
      );
      if (jsonMode) {
        const summary = buildSummary([], {
          repos_swept: 0,
          repos_total: targets.length,
          reset_in_seconds: probe.resetSeconds,
        });
        process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
      }
      // Exit 0 — a rate-limited skip is not a lie. The workflow
      // surfaces the situation via its sticky comment.
      process.exitCode = 0;
      return;
    }
  }

  log(`Honesty check across ${targets.length} repo(s)\n`);
  const verdicts: Verdict[] = [];
  let rateLimited: Summary["rate_limit_detail"] | undefined;
  let sweptCount = 0;
  for (const t of targets) {
    if (jsonMode) process.stderr.write(`• ${t.padEnd(36)} `);
    else process.stdout.write(`• ${t.padEnd(36)} `);
    try {
      const v = await audit(t);
      verdicts.push(v);
      sweptCount += 1;
      if (v.ok) log("✓");
      else log(`× (${v.lies.length} lie${v.lies.length === 1 ? "" : "s"})`);
    } catch (err) {
      // Rate-limit mid-sweep: stop. Every subsequent call will hit
      // the same 403, just burning latency without adding signal.
      if (err instanceof RateLimitError) {
        const reset = err.resetAtSeconds
          ? Math.max(0, err.resetAtSeconds - Math.floor(Date.now() / 1000))
          : null;
        log(`× rate-limit hit (reset in ${reset ?? "?"}s) — stopping early`);
        rateLimited = {
          repos_swept: sweptCount,
          repos_total: targets.length,
          reset_in_seconds: reset,
        };
        break;
      }
      const msg = (err as Error).message;
      log(`error: ${msg}`);
      verdicts.push({ repo: t, ok: false, lies: [`error: ${msg}`], notes: [] });
      sweptCount += 1;
    }
  }
  log("\n--- Details ---");
  let totalLies = 0;
  for (const v of verdicts) {
    log(`\n${v.repo}:`);
    for (const n of v.notes) log(n);
    if (v.lies.length) {
      log("  LIES:");
      for (const l of v.lies) log(l);
      // Don't double-count error lines (they're reported in `errors`
      // section of the JSON summary, not the lie count).
      const realLies = v.lies.filter((l) => !l.startsWith("error:"));
      totalLies += realLies.length;
    }
  }
  log(`\nTotal lies across ${verdicts.length} repos: ${totalLies}`);
  if (rateLimited) {
    log(
      `× Rate-limited after ${rateLimited.repos_swept}/${rateLimited.repos_total} repos. ` +
        `Reset in ${rateLimited.reset_in_seconds ?? "?"}s.`,
    );
  }
  if (jsonMode) {
    process.stdout.write(
      JSON.stringify(buildSummary(verdicts, rateLimited), null, 2) + "\n",
    );
  }
  // Rate-limited runs exit 0 even with partial verdicts — the
  // signal is incomplete, so we can't honestly call it a lie. Real
  // lies (verdicts.length > 0 AND no rate-limit) still exit 1.
  process.exitCode = !rateLimited && totalLies > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
