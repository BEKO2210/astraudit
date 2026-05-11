#!/usr/bin/env tsx
/**
 * Phase 6.49 — release preparation helper.
 *
 * Usage:
 *   npm run release:prep -- 1.0.0           # bump + roll CHANGELOG
 *   npm run release:prep -- 1.0.0 --dry-run # show the diff, don't write
 *
 * What it does, in order:
 *   1. Validates the version string is SemVer-shaped (X.Y.Z or
 *      X.Y.Z-prerelease).
 *   2. Updates `package.json` and `package-lock.json` to the new
 *      version (uses `npm version --no-git-tag-version`, which
 *      handles both files atomically).
 *   3. Rolls `CHANGELOG.md`:
 *      - If a `## [X.Y.Z]` section ALREADY exists, leaves it alone
 *        (so the maintainer can hand-curate the body first, run
 *        the prep script, and not have it overwritten).
 *      - Otherwise renames the current `## [Unreleased]` heading to
 *        `## [X.Y.Z] — YYYY-MM-DD` and inserts a fresh empty
 *        `## [Unreleased]` block above it.
 *
 *   4. Prints the exact `git` commands the maintainer should run to
 *      commit + push + tag. Does NOT run those commands itself —
 *      tagging is a deliberate maintainer action, not an automated
 *      one (a CI compromise should never tag).
 *
 * After this script runs, the maintainer reads the CHANGELOG diff,
 * polishes the new `## [X.Y.Z]` body if they want, then:
 *
 *   git add package.json package-lock.json CHANGELOG.md
 *   git commit -m "Release v$VERSION"
 *   git tag "v$VERSION"
 *   git push origin main "v$VERSION"
 *
 * The push of the tag triggers `release.yml` which builds, runs the
 * quality gates, packs `dist.zip`, and creates the GitHub Release.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/;

function fail(msg: string): never {
  console.error(`× ${msg}`);
  process.exit(1);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function rollChangelog(version: string, dryRun: boolean): "rolled" | "kept" {
  const file = path.join(ROOT, "CHANGELOG.md");
  const original = fs.readFileSync(file, "utf8");

  if (original.includes(`## [${version}]`)) {
    console.log(
      `  CHANGELOG.md already has a "## [${version}]" section — left as-is.`,
    );
    return "kept";
  }

  // Find the [Unreleased] heading, rename it, prepend a new empty
  // [Unreleased] block. The replacement is anchored on the exact
  // string so we never edit anything else by accident.
  const unreleasedHeading = "## [Unreleased]";
  if (!original.includes(unreleasedHeading)) {
    fail(
      "CHANGELOG.md is missing a `## [Unreleased]` section. " +
        "Add one before running release:prep.",
    );
  }

  const replacement = [
    "## [Unreleased]",
    "",
    "### Added",
    "",
    "- _(nothing yet)_",
    "",
    `## [${version}] — ${today()}`,
  ].join("\n");

  const next = original.replace(unreleasedHeading, replacement);

  if (dryRun) {
    console.log("  --dry-run: CHANGELOG.md would gain:");
    console.log(replacement.split("\n").map((l) => `      ${l}`).join("\n"));
    return "rolled";
  }
  fs.writeFileSync(file, next, "utf8");
  console.log(
    `  Rolled CHANGELOG.md: [Unreleased] → [${version}] — ${today()}, new empty [Unreleased] block prepended.`,
  );
  return "rolled";
}

function bumpVersion(version: string, dryRun: boolean): void {
  if (dryRun) {
    console.log(`  --dry-run: would run \`npm version ${version} --no-git-tag-version\``);
    return;
  }
  // `npm version` updates both package.json and package-lock.json
  // atomically and refuses to run if the working tree is dirty in
  // a way that conflicts — but doesn't care about unrelated dirt.
  execSync(`npm version ${version} --no-git-tag-version --allow-same-version`, {
    cwd: ROOT,
    stdio: "inherit",
  });
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const positional = args.filter((a) => !a.startsWith("--"));
  const version = positional[0];

  if (!version) {
    fail("usage: npm run release:prep -- <version> [--dry-run]");
  }
  if (!SEMVER_RE.test(version)) {
    fail(`"${version}" is not a SemVer string (expected X.Y.Z or X.Y.Z-pre).`);
  }

  console.log(`Preparing release v${version}${dryRun ? " (dry run)" : ""}…`);
  console.log("");
  console.log("1. Bumping package.json + package-lock.json");
  bumpVersion(version, dryRun);
  console.log("");
  console.log("2. Rolling CHANGELOG.md");
  rollChangelog(version, dryRun);
  console.log("");
  console.log("3. Next steps (run by hand — tagging is NOT automated):");
  console.log("");
  console.log(`   # Review the CHANGELOG diff, polish the new [${version}] body if desired.`);
  console.log(`   git diff CHANGELOG.md`);
  console.log("");
  console.log("   # Once you're happy:");
  console.log("   git add package.json package-lock.json CHANGELOG.md");
  console.log(`   git commit -m "Release v${version}"`);
  console.log(`   git tag "v${version}"`);
  console.log(`   git push origin main "v${version}"`);
  console.log("");
  console.log(
    "The tag push triggers .github/workflows/release.yml which builds,",
  );
  console.log(
    "runs the quality gates, packs dist.zip, and creates the GitHub Release",
  );
  console.log(
    `body from the "## [${version}]" section of CHANGELOG.md.`,
  );
}

main();
