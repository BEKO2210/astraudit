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
  // The 520 KB ceiling absorbs ~7% normal drift before the gate fires.
  { label: "main entry chunk", prefix: "index-", suffix: ".js", maxBytes: 520 * 1024 },
  // AuditGraph is React Flow's lazy chunk — Phase 4.4 split it out so
  // it doesn't load until the user enters the dashboard.
  { label: "AuditGraph chunk (React Flow)", prefix: "AuditGraph-", suffix: ".js", maxBytes: 175 * 1024 },
  // Audit worker — the rule engine, runs off the main thread.
  { label: "audit worker", prefix: "audit.worker-", suffix: ".js", maxBytes: 110 * 1024 },
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

function main(): void {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(
      `× ${ASSETS_DIR} not found — run \`npm run build\` first.`,
    );
    process.exit(2);
  }

  let failed = false;
  for (const budget of BUDGETS) {
    const file = findAsset(budget.prefix, budget.suffix);
    if (!file) {
      console.error(
        `× ${budget.label}: no file matched ${budget.prefix}*${budget.suffix} in dist/assets/`,
      );
      failed = true;
      continue;
    }
    const size = fs.statSync(file).size;
    const status = size <= budget.maxBytes ? "✓" : "×";
    const headroom = budget.maxBytes - size;
    const headroomLabel =
      headroom >= 0
        ? `${fmt(headroom)} under budget`
        : `${fmt(-headroom)} OVER budget`;
    console.log(
      `${status} ${budget.label.padEnd(32)}  ${fmt(size).padStart(10)}  / ${fmt(budget.maxBytes)}  (${headroomLabel})`,
    );
    if (size > budget.maxBytes) failed = true;
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
