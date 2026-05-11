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

const DEFAULT_TARGETS = [
  // JS / TS ecosystem
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
  // Python
  "django/django",
  "pallets/flask",
  "psf/requests",
  "fastapi/fastapi",
  "pandas-dev/pandas",
  // Rust
  "rust-lang/rust",
  "tokio-rs/tokio",
  "BurntSushi/ripgrep",
  // Go
  "golang/go",
  "kubernetes/kubernetes",
  "gin-gonic/gin",
  // Ruby
  "rails/rails",
  "ruby/ruby",
  // Other
  "torvalds/linux",
  "git/git",
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
  const truthDependabot = dotGithub.some((f) => /dependabot\.(yml|yaml)$/i.test(f));
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

async function main() {
  const arg = process.argv[2];
  const targets = arg ? [arg] : DEFAULT_TARGETS;
  console.log(`Honesty check across ${targets.length} repo(s)\n`);
  const verdicts: Verdict[] = [];
  for (const t of targets) {
    process.stdout.write(`• ${t.padEnd(28)} `);
    try {
      const v = await audit(t);
      verdicts.push(v);
      if (v.ok) console.log("✓");
      else console.log(`× (${v.lies.length} lie${v.lies.length === 1 ? "" : "s"})`);
    } catch (err) {
      console.log(`error: ${(err as Error).message}`);
      verdicts.push({ repo: t, ok: false, lies: [`error: ${(err as Error).message}`], notes: [] });
    }
  }
  console.log("\n--- Details ---");
  let totalLies = 0;
  for (const v of verdicts) {
    console.log(`\n${v.repo}:`);
    for (const n of v.notes) console.log(n);
    if (v.lies.length) {
      console.log("  LIES:");
      for (const l of v.lies) console.log(l);
      totalLies += v.lies.length;
    }
  }
  console.log(`\nTotal lies across ${targets.length} repos: ${totalLies}`);
  process.exitCode = totalLies > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
