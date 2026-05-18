#!/usr/bin/env tsx
/**
 * Important-file coverage probe.
 *
 * Audits a small fixed sample (the four ExampleRepos) + an
 * optional list of additional repos passed on the CLI, and
 * reports for each one:
 *   - the actual filenames the GitHub tree contains for every
 *     IMPORTANT_ROOT_FILES entry,
 *   - which canonical filenames Astraudit reports as "missing",
 *   - mismatches where a known alias exists but the canonical
 *     is flagged missing.
 *
 * Used as the manual regression check for the
 * `IMPORTANT_FILE_ALIASES` map. Run with a GitHub PAT set in
 * GITHUB_TOKEN to lift the 60 req/h limit:
 *
 *   GITHUB_TOKEN=ghp_xxx tsx scripts/probe-important-files.ts
 *   GITHUB_TOKEN=ghp_xxx tsx scripts/probe-important-files.ts vercel/next.js denoland/deno
 *
 * Exit code is 0 always — this is a reporting tool, not a CI gate.
 */

import { EXAMPLE_REPOS } from "../src/data/exampleRepos";
import {
  IMPORTANT_FILE_ALIASES,
  IMPORTANT_ROOT_FILES,
} from "../src/data/auditRules";
import { loadRepoBundle } from "../src/lib/github/index";
import { classifyFiles } from "../src/lib/audit/fileClassifier";

interface RepoReport {
  fullName: string;
  treeTotal: number;
  present: string[];
  missing: string[];
  /** Files the tree contains that look like aliases of a "missing" canonical. */
  aliasNeedingMatch: Array<{ canonical: string; actual: string }>;
  /** Every .md file at the repo root — for visual sanity. */
  rootMarkdown: string[];
  error?: string;
}

const COMMON_DOCS_PATTERNS = [
  /^readme(?:\..+)?$/i,
  /^history(?:\..+)?$/i,
  /^changelog(?:\..+)?$/i,
  /^changes(?:\..+)?$/i,
  /^contributing(?:\..+)?$/i,
  /^code[._-]?of[._-]?conduct(?:\..+)?$/i,
  /^security(?:\..+)?$/i,
  /^license(?:\..+)?$/i,
  /^licence(?:\..+)?$/i,
  /^copying(?:\..+)?$/i,
  /^codeowners(?:\..+)?$/i,
];

function isCommonDoc(basename: string): boolean {
  return COMMON_DOCS_PATTERNS.some((re) => re.test(basename));
}

async function probeRepo(fullName: string): Promise<RepoReport> {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    return {
      fullName,
      treeTotal: 0,
      present: [],
      missing: [],
      aliasNeedingMatch: [],
      rootMarkdown: [],
      error: "Invalid fullName",
    };
  }
  try {
    const bundle = await loadRepoBundle({ owner, repo });
    const classified = classifyFiles(bundle.tree, bundle.importantFiles);
    const rootMarkdown: string[] = [];
    for (const entry of bundle.tree.entries) {
      if (entry.type !== "blob") continue;
      if (entry.path.includes("/")) continue;
      const lower = entry.path.toLowerCase();
      if (lower.endsWith(".md") || isCommonDoc(entry.path)) {
        rootMarkdown.push(entry.path);
      }
    }

    // Spot-check: for every missing canonical, see whether the
    // repo root contains a file matching a known doc pattern that
    // we might be ignoring.
    const aliasNeedingMatch: RepoReport["aliasNeedingMatch"] = [];
    for (const canonical of classified.importantFilesMissing) {
      const aliases = IMPORTANT_FILE_ALIASES[canonical] ?? [];
      for (const alias of aliases) {
        const lower = alias.toLowerCase();
        for (const entry of bundle.tree.entries) {
          if (entry.type !== "blob") continue;
          if (entry.path.toLowerCase() === lower) {
            aliasNeedingMatch.push({ canonical, actual: entry.path });
            break;
          }
        }
      }
    }

    return {
      fullName,
      treeTotal: classified.totalFiles,
      present: classified.importantFilesPresent,
      missing: classified.importantFilesMissing,
      aliasNeedingMatch,
      rootMarkdown,
    };
  } catch (err) {
    return {
      fullName,
      treeTotal: 0,
      present: [],
      missing: [],
      aliasNeedingMatch: [],
      rootMarkdown: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function printReport(report: RepoReport): void {
  // eslint-disable-next-line no-console
  console.log(`\n=== ${report.fullName} (${report.treeTotal} files) ===`);
  if (report.error) {
    // eslint-disable-next-line no-console
    console.log(`  ! Error: ${report.error}`);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(
    `  Root .md / docs files (${report.rootMarkdown.length}): ${report.rootMarkdown.join(", ") || "(none)"}`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `  Present (${report.present.length}/${IMPORTANT_ROOT_FILES.length}): ${report.present.join(", ")}`,
  );
  // eslint-disable-next-line no-console
  console.log(`  Missing (${report.missing.length}): ${report.missing.join(", ")}`);
  if (report.aliasNeedingMatch.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`  ⚠  Aliases not honoured:`);
    for (const m of report.aliasNeedingMatch) {
      // eslint-disable-next-line no-console
      console.log(`     - ${m.canonical} is "missing" but ${m.actual} exists`);
    }
  }
}

async function main(): Promise<void> {
  const cliRepos = process.argv.slice(2);
  const targets = [
    ...EXAMPLE_REPOS.map((r) => r.fullName),
    ...cliRepos,
  ];
  // eslint-disable-next-line no-console
  console.log(
    `Probing ${targets.length} repository/repositories. Tip: set GITHUB_TOKEN to lift the 60 req/h limit.`,
  );

  for (const target of targets) {
    const report = await probeRepo(target);
    printReport(report);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
