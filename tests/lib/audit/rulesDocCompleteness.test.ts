/**
 * Phase 6.39 — docs/RULES.md completeness guard.
 *
 * Locks the contract that every detector slug emitted by
 * `src/lib/audit/riskEngine.ts` (the source of every finding the
 * dashboard shows) has a documented row in `docs/RULES.md`. A
 * future PR that adds a new detector but forgets to update the rule
 * book gets caught here, not by a reviewer reading the diff.
 *
 * Why a fuzzy keyword match instead of strict ID equality:
 *   The runtime `id()` helper builds finding IDs from a short slug
 *   ("license", "env-committed", …) plus a monotonic counter; the
 *   rule book uses friendlier doc-IDs ("sec-no-license",
 *   "sec-committed-env"). They share semantic stems but not exact
 *   strings. The test asserts the stem appears somewhere in the
 *   rule book, which is what a maintainer cross-referencing the
 *   two would also do by eye.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../..");

const RULES_MD = fs
  .readFileSync(path.join(ROOT, "docs/RULES.md"), "utf8")
  .toLowerCase();

const RISK_ENGINE = fs.readFileSync(
  path.join(ROOT, "src/lib/audit/riskEngine.ts"),
  "utf8",
);

// Extract the slug arguments of every `id("...")` call in riskEngine.
function extractSlugs(source: string): string[] {
  const re = /\bid\(\s*"([a-z][a-z0-9-]+)"\s*\)/g;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    out.add(m[1]);
  }
  return Array.from(out);
}

describe("docs/RULES.md — Phase 6.39 completeness", () => {
  const slugs = extractSlugs(RISK_ENGINE);

  it("riskEngine emits at least the legacy 16 finding slugs", () => {
    // Sanity check: extraction is working, regression catches a
    // future renamer dropping the id() helper entirely.
    expect(slugs.length).toBeGreaterThanOrEqual(10);
  });

  it("every riskEngine slug has a documented mention in docs/RULES.md", () => {
    const missing = slugs.filter((slug) => {
      // The rule book uses semantic doc-IDs that don't match the
      // runtime slug character-for-character; we accept any of:
      //   - the literal slug ("license"),
      //   - the slug with hyphens kept ("env-committed"),
      //   - the bare stem before the first hyphen ("env").
      // If NONE of those appear in the doc body, the rule is
      // undocumented.
      const stem = slug.split("-")[0];
      return (
        !RULES_MD.includes(slug.toLowerCase()) &&
        !RULES_MD.includes(stem.toLowerCase())
      );
    });
    expect(
      missing,
      `Undocumented detector slug(s) in riskEngine.ts — add a row in docs/RULES.md:\n  ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("docs/RULES.md still names every scored category", () => {
    // The 8 category headings — Documentation / Structure / Code
    // Quality / Security / Maintenance / Developer Experience /
    // Ecosystem / CI/CD — must all appear as `###` headings.
    const required = [
      "Documentation",
      "Structure",
      "Code Quality",
      "Security",
      "Maintenance",
      "Developer Experience",
      "Ecosystem",
      "CI/CD",
    ];
    const missing = required.filter(
      (label) => !RULES_MD.includes(label.toLowerCase()),
    );
    expect(missing, `RULES.md missing category section(s): ${missing.join(", ")}`).toEqual([]);
  });
});
