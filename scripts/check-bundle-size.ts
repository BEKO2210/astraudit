#!/usr/bin/env tsx
/**
 * Phase 6.15 — Bundle-size budget gate.
 *
 * Enforces a hard ceiling on the production main chunk so a careless
 * eager import can't quietly inflate first-paint cost. Runs after
 * `npm run build` (locally and in CI) and exits non-zero when any
 * tracked asset drifts past its budget.
 *
 * Budgets are intentionally conservative — set just above today's
 * post-Phase-6.16 sizes so we get a one-PR warning before regressions
 * compound. Bump the budget deliberately with a comment explaining
 * why (a new feature lands, an upstream dep grew, etc.).
 *
 * Reading: each entry caps the un-gzipped size of one *kind* of asset
 * matched by its glob. Gzip is not the gate because the gzip ratio
 * varies with content shape (already-compressed images vs minified
 * code), so we keep the policy explicit on raw bytes.
 *
 * Roadmap M1.1 — pass `--json` to emit a machine-readable report on
 * stdout instead of the human table. Used by the bundle-size workflow
 * to compute base-vs-head deltas for the sticky PR comment. The
 * `--json` mode also suppresses the non-zero exit on a budget breach:
 * the workflow surfaces the comment first, then the existing
 * non-JSON invocation in `quality.yml` is what actually blocks merge.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Budget {
  /** Human label for the failure message. */
  label: string;
  /** Glob-ish prefix + suffix; we don't pull in a glob lib for one file. */
  prefix: string;
  suffix: string;
  /** Hard ceiling in bytes. */
  maxBytes: number;
}

const ASSETS_DIR = path.resolve(__dirname, "../dist/assets");

const BUDGETS: Budget[] = [
  // Main entry chunk — the JS users pay for on first paint.
  // Phase 6.16 brought it from 537 KB to 484 KB by lazy-loading the
  // BadgeDialog / CompareDashboard / CommandPalette / legal pages.
  // 2026-05 dep bump (React 19.2 + reactflow 11.11 + markdown-it 14.1 +
  // friends) raised the post-build size to ~549 KB; ceiling lifted to
  // 570 KB to absorb the new baseline plus ~4% normal drift. M4.3
  // slice 6b finished the SPA‑shell i18n sweep (EN/DE/JA catalogs +
  // ~30 extra translated panel strings landed in App.tsx/components),
  // pushing the main chunk to ~571 KB. Ceiling raised to 580 KB.
  // M7.1.2 added the eager WatchedDialog + Hero opener + sticky-bar
  // watch toggle + 20 catalog keys × 3 locales; chunk grew to ~585
  // KB. Ceiling raised to 610 KB to absorb the rest of Monat 7
  // (notification opt-in, keymap editor) without per-slice bumps.
  { label: "main entry chunk", prefix: "index-", suffix: ".js", maxBytes: 610 * 1024 },
  // AuditGraph is React Flow's lazy chunk — Phase 4.4 split it out so
  // it doesn't load until the user enters the dashboard.
  { label: "AuditGraph chunk (React Flow)", prefix: "AuditGraph-", suffix: ".js", maxBytes: 175 * 1024 },
  // Audit worker — the rule engine, runs off the main thread.
  // Monat 5 rule packs (i18n / ts / a11y / monorepo) live inside the
  // worker bundle. Each adds ~5 KB; ceiling raised to 130 KB so the
  // four packs land without per-slice budget bumps.
  { label: "audit worker", prefix: "audit.worker-", suffix: ".js", maxBytes: 130 * 1024 },
];

function findAsset(prefix: string, suffix: string): string | null {
  if (!fs.existsSync(ASSETS_DIR)) return null;
  const match = fs
    .readdirSync(ASSETS_DIR)
    .find((name) => name.startsWith(prefix) && name.endsWith(suffix));
  return match ? path.join(ASSETS_DIR, match) : null;
}

function fmt(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

interface BudgetReport {
  label: string;
  prefix: string;
  suffix: string;
  maxBytes: number;
  /** File found in dist/assets — null when the glob didn't match. */
  file: string | null;
  /** Actual size in bytes, null when no file was found. */
  actualBytes: number | null;
}

function collect(): BudgetReport[] {
  return BUDGETS.map((budget) => {
    const file = findAsset(budget.prefix, budget.suffix);
    return {
      label: budget.label,
      prefix: budget.prefix,
      suffix: budget.suffix,
      maxBytes: budget.maxBytes,
      file: file ? path.basename(file) : null,
      actualBytes: file ? fs.statSync(file).size : null,
    };
  });
}

function main(): void {
  const jsonMode = process.argv.includes("--json");

  if (!fs.existsSync(ASSETS_DIR)) {
    if (jsonMode) {
      // Emit a structured "no build" payload so the downstream diff
      // step can render a graceful "head build failed" comment
      // instead of crashing.
      process.stdout.write(
        JSON.stringify({ assetsDir: ASSETS_DIR, found: false, budgets: [] }) +
          "\n",
      );
      return;
    }
    console.error(
      `× ${ASSETS_DIR} not found — run \`npm run build\` first.`,
    );
    process.exit(2);
  }

  const reports = collect();

  if (jsonMode) {
    process.stdout.write(
      JSON.stringify({ assetsDir: ASSETS_DIR, found: true, budgets: reports }) +
        "\n",
    );
    return;
  }

  let failed = false;
  for (const r of reports) {
    if (r.file === null || r.actualBytes === null) {
      console.error(
        `× ${r.label}: no file matched ${r.prefix}*${r.suffix} in dist/assets/`,
      );
      failed = true;
      continue;
    }
    const status = r.actualBytes <= r.maxBytes ? "✓" : "×";
    const headroom = r.maxBytes - r.actualBytes;
    const headroomLabel =
      headroom >= 0
        ? `${fmt(headroom)} under budget`
        : `${fmt(-headroom)} OVER budget`;
    console.log(
      `${status} ${r.label.padEnd(32)}  ${fmt(r.actualBytes).padStart(10)}  / ${fmt(r.maxBytes)}  (${headroomLabel})`,
    );
    if (r.actualBytes > r.maxBytes) failed = true;
  }

  if (failed) {
    console.error(
      "\nBudget exceeded. Either: (a) split the offending chunk further (lazy() + Suspense), (b) drop a dependency, or (c) raise the ceiling in scripts/check-bundle-size.ts with a comment explaining why.",
    );
    process.exit(1);
  }
  console.log("\nAll bundle-size budgets cleared.");
}

main();
