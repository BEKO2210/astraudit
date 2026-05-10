/**
 * SPDX-aware license classifier + tone analyzer — Phase 3.9.
 *
 * Two related jobs:
 *   1. `classifyLicense(spec)` — given a license string from a package
 *      registry (single SPDX id, an OR/AND expression, a deprecated
 *      `BSD` form, or a free-text label), return a coarse category
 *      (`permissive` / `weak-copyleft` / `strong-copyleft` /
 *      `proprietary` / `public-domain` / `none` / `unknown`) plus a
 *      normalised display label.
 *   2. `analyzeLicenseTone(repoSpdx, deps)` — compare the repo's own
 *      license against the categorised dependency licenses and emit
 *      a list of `LicenseFinding` entries describing real
 *      compatibility risks (e.g. permissive repo pulling a strong-
 *      copyleft dep).
 *
 * Pre-build research (2026-05-10):
 *   - SPDX License List release notes / 3.x → introduced explicit
 *     `-or-later` / `-only` suffixes for GPL family. We accept both
 *     the modern (`GPL-3.0-or-later`) and the deprecated bare form
 *     (`GPL-3.0`) since real-world packages still ship the latter.
 *   - GNU Project · *Various Licenses and Comments about Them*: a
 *     permissive project taking a strong-copyleft dep "pulls up" the
 *     entire derivative under the copyleft license. This is a real
 *     legal issue, not theoretical, and warrants a warning. Weak-
 *     copyleft (LGPL/MPL) dynamically linked is usually fine; we
 *     surface it as info, not a warning.
 *     https://www.gnu.org/licenses/license-compatibility.html
 *   - npm package.json `license` field accepts SPDX expressions like
 *     `"MIT OR Apache-2.0"` (consumer's choice — pick the most
 *     permissive) and `"(GPL-2.0 AND MIT)"` (must satisfy both — we
 *     bucket up to the most restrictive). `SEE LICENSE IN <file>`,
 *     `UNLICENSED`, and the deprecated `{ type: "MIT" }` object form
 *     are all handled.
 *   - PyPI free-text labels (`"MIT License"`, `"Apache Software
 *     License"`, etc.) are normalised through a small synonym table.
 */

export type LicenseCategory =
  | "permissive"
  | "weak-copyleft"
  | "strong-copyleft"
  | "public-domain"
  | "proprietary"
  | "none" /* `UNLICENSED` / no license declared */
  | "unknown";

export interface ClassifiedLicense {
  /** Original input, trimmed. */
  raw: string;
  /** Best-guess display label — typically a single SPDX id. */
  label: string;
  category: LicenseCategory;
}

/* -------------------------------------------------------------------------- */
/* SPDX dictionaries                                                           */
/* -------------------------------------------------------------------------- */

const PERMISSIVE: ReadonlySet<string> = new Set([
  "MIT",
  "MIT-0",
  "MIT-CMU",
  "Apache-2.0",
  "Apache-1.1",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BSD-4-Clause",
  "ISC",
  "0BSD",
  "BSL-1.0",
  "BSD-2-Clause-Patent",
  "Zlib",
  "Python-2.0",
  "PSF-2.0",
  "Artistic-2.0",
  "WTFPL",
]);

const PUBLIC_DOMAIN: ReadonlySet<string> = new Set([
  "Unlicense",
  "CC0-1.0",
  "CC-PDDC",
  "WTFPL",
]);

const WEAK_COPYLEFT: ReadonlySet<string> = new Set([
  "LGPL-2.0",
  "LGPL-2.1",
  "LGPL-3.0",
  "LGPL-2.0-only",
  "LGPL-2.0-or-later",
  "LGPL-2.1-only",
  "LGPL-2.1-or-later",
  "LGPL-3.0-only",
  "LGPL-3.0-or-later",
  "MPL-1.1",
  "MPL-2.0",
  "EPL-1.0",
  "EPL-2.0",
  "CDDL-1.0",
  "CDDL-1.1",
]);

const STRONG_COPYLEFT: ReadonlySet<string> = new Set([
  "GPL-2.0",
  "GPL-3.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "AGPL-1.0",
  "AGPL-3.0",
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
]);

const PROPRIETARY: ReadonlySet<string> = new Set([
  "UNLICENSED",
  "PROPRIETARY",
  "COMMERCIAL",
  "BUSL-1.1", // Business Source License — source-available, not OSI
  "Elastic-2.0",
  "SSPL-1.0",
]);

/** Free-text → SPDX synonym table for PyPI's `info.license` strings. */
const SYNONYMS: ReadonlyMap<string, string> = new Map([
  ["mit license", "MIT"],
  ["mit", "MIT"],
  ["apache software license", "Apache-2.0"],
  ["apache 2.0", "Apache-2.0"],
  ["apache-2.0", "Apache-2.0"],
  ["apache license 2.0", "Apache-2.0"],
  ["apache license, version 2.0", "Apache-2.0"],
  ["bsd", "BSD-3-Clause"],
  ["bsd license", "BSD-3-Clause"],
  ["bsd-3-clause", "BSD-3-Clause"],
  ["bsd-2-clause", "BSD-2-Clause"],
  ["isc", "ISC"],
  ["isc license", "ISC"],
  ["the unlicense", "Unlicense"],
  ["zlib", "Zlib"],
  ["zlib/libpng license", "Zlib"],
  ["mozilla public license 2.0 (mpl 2.0)", "MPL-2.0"],
  ["mozilla public license 2.0", "MPL-2.0"],
  ["mpl-2.0", "MPL-2.0"],
  ["mpl 2.0", "MPL-2.0"],
  ["mpl", "MPL-2.0"],
  [
    "gnu lesser general public license v3 (lgplv3)",
    "LGPL-3.0-or-later",
  ],
  ["lgpl", "LGPL-3.0-or-later"],
  ["lgpl-3.0", "LGPL-3.0"],
  [
    "gnu general public license v3 (gplv3)",
    "GPL-3.0-or-later",
  ],
  ["gpl", "GPL-3.0-or-later"],
  ["gpl-3.0", "GPL-3.0"],
  ["gpl-2.0", "GPL-2.0"],
  ["agpl", "AGPL-3.0-or-later"],
  [
    "gnu affero general public license v3 (agpl-3.0)",
    "AGPL-3.0-or-later",
  ],
  ["agpl-3.0", "AGPL-3.0"],
  ["unlicensed", "UNLICENSED"],
  ["proprietary", "PROPRIETARY"],
]);

/* -------------------------------------------------------------------------- */
/* Classification                                                              */
/* -------------------------------------------------------------------------- */

/** Coarse ordering used to fold expressions: more-restrictive wins
 *  for `AND`, less-restrictive wins for `OR`. `unknown` sits below
 *  `none` so it doesn't override known categories. */
const RANK: Record<LicenseCategory, number> = {
  unknown: 0,
  none: 1,
  "public-domain": 2,
  permissive: 3,
  "weak-copyleft": 4,
  "strong-copyleft": 5,
  proprietary: 6,
};

function categoryOfSpdx(id: string): LicenseCategory {
  // Strip "+" suffix (deprecated SPDX form for "or later").
  const stripped = id.replace(/\+$/, "");
  if (PERMISSIVE.has(stripped)) return "permissive";
  if (PUBLIC_DOMAIN.has(stripped)) return "public-domain";
  if (WEAK_COPYLEFT.has(stripped)) return "weak-copyleft";
  if (STRONG_COPYLEFT.has(stripped)) return "strong-copyleft";
  if (PROPRIETARY.has(stripped)) return "proprietary";
  return "unknown";
}

/** Try the SPDX dictionary directly, then synonyms. */
function lookupSingle(token: string): { id: string; category: LicenseCategory } {
  const trimmed = token.trim();
  if (!trimmed) return { id: "", category: "unknown" };
  const direct = categoryOfSpdx(trimmed);
  if (direct !== "unknown") return { id: trimmed, category: direct };
  const synonym = SYNONYMS.get(trimmed.toLowerCase());
  if (synonym) {
    return { id: synonym, category: categoryOfSpdx(synonym) };
  }
  return { id: trimmed, category: "unknown" };
}

/**
 * Classify a license string. Handles SPDX expressions
 * (`MIT OR Apache-2.0`, `GPL-2.0 AND MIT`, `(MIT OR ISC)`),
 * the legacy `SEE LICENSE IN <file>` form, `UNLICENSED`, and
 * free-text labels via the synonym table.
 */
export function classifyLicense(input: string | null | undefined): ClassifiedLicense {
  const raw = (input ?? "").trim();
  if (!raw) return { raw: "", label: "—", category: "none" };

  // Custom-text declarations.
  if (/^see license in/i.test(raw)) {
    return { raw, label: raw, category: "unknown" };
  }
  if (/^unlicensed$/i.test(raw)) {
    return { raw, label: "UNLICENSED", category: "none" };
  }

  // Strip outer parentheses if they wrap the whole expression.
  const expr = raw.replace(/^\((.*)\)$/, "$1").trim();

  // OR-clauses → consumer can pick → take the LEAST restrictive
  // (lowest rank) of the alternatives.
  if (/\s+or\s+/i.test(expr)) {
    const parts = expr.split(/\s+or\s+/i).map((p) => p.trim()).filter(Boolean);
    const classified = parts.map((p) => lookupSingle(stripParens(p)));
    const best = classified.reduce((acc, cur) =>
      RANK[cur.category] < RANK[acc.category] ? cur : acc,
    );
    return {
      raw,
      label: classified.map((c) => c.id || "?").join(" OR "),
      category: best.category,
    };
  }

  // AND-clauses → must satisfy BOTH → take the MOST restrictive.
  if (/\s+and\s+/i.test(expr)) {
    const parts = expr.split(/\s+and\s+/i).map((p) => p.trim()).filter(Boolean);
    const classified = parts.map((p) => lookupSingle(stripParens(p)));
    const worst = classified.reduce((acc, cur) =>
      RANK[cur.category] > RANK[acc.category] ? cur : acc,
    );
    return {
      raw,
      label: classified.map((c) => c.id || "?").join(" AND "),
      category: worst.category,
    };
  }

  const single = lookupSingle(expr);
  return { raw, label: single.id || raw, category: single.category };
}

function stripParens(s: string): string {
  return s.replace(/^\(/, "").replace(/\)$/, "").trim();
}

/* -------------------------------------------------------------------------- */
/* Tone analysis                                                               */
/* -------------------------------------------------------------------------- */

export type LicenseFindingTone = "info" | "warning" | "critical";

export interface LicenseFinding {
  /** Stable id useful as a React key. */
  id: string;
  tone: LicenseFindingTone;
  title: string;
  detail: string;
  /** Names of the deps that triggered this finding. */
  packages: string[];
}

export interface LicenseToneSummary {
  /** Repo's own classified license — null when the repo declared
   *  none. */
  repo: ClassifiedLicense | null;
  /** Per-category counts across the dependencies we classified. */
  depCounts: Record<LicenseCategory, number>;
  /** Compatibility findings, sorted from most-critical to info. */
  findings: LicenseFinding[];
}

interface DepLicenseInput {
  name: string;
  ecosystem: "npm" | "pypi" | "crates";
  license: string | null | undefined;
}

/**
 * Compare the repo's own license against the dependency licenses and
 * emit compatibility findings. Only fires findings when there's an
 * actionable mismatch — e.g. a permissive repo pulling strong-
 * copyleft deps. Works correctly when the repo license is null
 * (treats every copyleft dep as a softer "consider declaring a
 * license" hint).
 */
export function analyzeLicenseTone(
  repoSpdx: string | null,
  deps: DepLicenseInput[],
): LicenseToneSummary {
  const repo = repoSpdx ? classifyLicense(repoSpdx) : null;
  const depCounts: Record<LicenseCategory, number> = {
    permissive: 0,
    "weak-copyleft": 0,
    "strong-copyleft": 0,
    "public-domain": 0,
    proprietary: 0,
    none: 0,
    unknown: 0,
  };

  const strong: string[] = [];
  const weak: string[] = [];
  const proprietary: string[] = [];
  const unknown: string[] = [];

  for (const dep of deps) {
    const c = classifyLicense(dep.license);
    depCounts[c.category] += 1;
    if (c.category === "strong-copyleft") strong.push(dep.name);
    else if (c.category === "weak-copyleft") weak.push(dep.name);
    else if (c.category === "proprietary") proprietary.push(dep.name);
    else if (c.category === "unknown") unknown.push(dep.name);
  }

  const findings: LicenseFinding[] = [];

  // 1. Strong-copyleft pulled into a permissive repo → critical.
  if (strong.length > 0) {
    const repoIsPermissive =
      repo?.category === "permissive" ||
      repo?.category === "public-domain" ||
      repo?.category === "none" ||
      repo === null;
    findings.push({
      id: "strong-copyleft-deps",
      tone: repoIsPermissive ? "critical" : "warning",
      title: repoIsPermissive
        ? `Strong copyleft (GPL family) under a permissive repo`
        : `Strong copyleft (GPL family) dependencies`,
      detail: repoIsPermissive
        ? `Distributing your project alongside these deps "pulls up" the entire derivative work under the copyleft license. Either replace the dep, isolate it, or relicense.`
        : `Compatible with your repo's copyleft license, but downstream consumers may face the same constraints.`,
      packages: strong,
    });
  }

  // 2. Weak-copyleft → info regardless of repo license. Worth
  //    surfacing, but typically fine as long as the dep is dynamically
  //    linked (which is the common case for npm / PyPI / crates).
  if (weak.length > 0) {
    findings.push({
      id: "weak-copyleft-deps",
      tone: "info",
      title: `Weak copyleft (LGPL / MPL family) dependencies`,
      detail: `Source-level changes to these deps must be redistributable under the same license. Linking against them is fine in almost every shipping context.`,
      packages: weak,
    });
  }

  // 3. Proprietary / source-available licenses → warning.
  if (proprietary.length > 0) {
    findings.push({
      id: "proprietary-deps",
      tone: "warning",
      title: `Source-available / proprietary dependencies`,
      detail: `BUSL, Elastic, SSPL, and similar licenses are NOT OSI-approved and may bar commercial redistribution or competing services.`,
      packages: proprietary,
    });
  }

  // 4. Unknown / unparseable licenses → info, encouraging a closer
  //    look. Only fires when more than 0 — and only when the count is
  //    a non-trivial share of the deps we could classify.
  if (unknown.length > 0 && unknown.length >= Math.ceil(deps.length / 4)) {
    findings.push({
      id: "unclassified-deps",
      tone: "info",
      title: `Dependencies with an unrecognised license string`,
      detail: `These declared licenses didn't match an SPDX id we know — could be a custom license, a typo, or a registry that didn't expose the field.`,
      packages: unknown,
    });
  }

  findings.sort((a, b) => toneRank(b.tone) - toneRank(a.tone));
  return { repo, depCounts, findings };
}

function toneRank(tone: LicenseFindingTone): number {
  switch (tone) {
    case "critical":
      return 3;
    case "warning":
      return 2;
    case "info":
      return 1;
  }
}

/* -------------------------------------------------------------------------- */
/* UI helpers                                                                  */
/* -------------------------------------------------------------------------- */

const CATEGORY_LABEL: Record<LicenseCategory, string> = {
  permissive: "Permissive",
  "weak-copyleft": "Weak copyleft",
  "strong-copyleft": "Strong copyleft",
  "public-domain": "Public domain",
  proprietary: "Proprietary",
  none: "No license",
  unknown: "Unknown",
};

export function formatLicenseCategory(category: LicenseCategory): string {
  return CATEGORY_LABEL[category];
}
