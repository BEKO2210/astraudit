/**
 * package.json manifest parser — Phase 3.5.
 *
 * The audit already pulls scripts and broad framework hints from the
 * manifest. This module reads the *runtime contract* fields that
 * adopters care about specifically:
 *
 *   - `engines.node` → which Node major(s) the project pins
 *   - `engines.npm` / `yarn` / `pnpm` → package-manager pinning
 *   - `packageManager` → the Corepack-format pin
 *     (e.g. `pnpm@9.7.0+sha256.…`)
 *   - `peerDependencies` + `peerDependenciesMeta` → declared host
 *     dependencies, with optional flag
 *   - `type: "module"` → ESM declaration
 *
 * Pre-build research (2026-05-10):
 *   - npm Docs · *package.json* — `engines` accepts SemVer range
 *     syntax (`>=18`, `^20.10`, `>=18 <21`); not strictly enforced by
 *     `npm install` but `corepack`, CI, and consumers do honour it.
 *   - Node.js *previous-releases* page — the LTS / EOL state changes
 *     over time. **As of May 2026:** Node 18 (Hydrogen) and Node 20
 *     (Iron) are EOL. Node 22 (Jod) and Node 24 (Krypton) are
 *     supported LTS. Anything pinning to ≤ 20 is targeting EOL
 *     runtimes — useful audit signal.
 *   - npm v7+ installs `peerDependencies` automatically; `optional:
 *     true` in `peerDependenciesMeta` opts out. Older
 *     advice / docs still treat them as warnings — we surface both.
 *
 * Sources:
 *   - https://docs.npmjs.com/cli/v10/configuring-npm/package-json#engines
 *   - https://docs.npmjs.com/cli/v10/configuring-npm/package-json#peerdependencies
 *   - https://nodejs.org/en/about/previous-releases
 *
 * Implementation choice: we deliberately do NOT pull `semver` (~30 KB)
 * for this. The audit only needs to extract the *minimum major* from a
 * range, which is a tiny regex job. Anything more nuanced
 * (exact-match calculations, intersection) is out of scope.
 */

import { tryParseJson } from "../utils/safeText";
import type { ClassifiedFiles } from "./fileClassifier";
import { createSafeDict, safeAssign } from "./safeDict";

/** Coarse classification of an `engines.node` declaration. */
export type NodeFreshness =
  | "missing" /*       no engines.node at all                      */
  | "any" /*           field present but unconstrained             */
  | "modern" /*        ≥ current LTS (Node 22/24 in 2026)          */
  | "current" /*       not EOL but behind current LTS              */
  | "aging" /*         pins an EOL major (e.g. >=18, >=20)         */
  | "ancient"; /*       pins a pre-LTS-cycle major (≤ 16)           */

export interface PeerDependency {
  name: string;
  range: string;
  optional: boolean;
}

export interface ParsedManifest {
  /** `name` field — null when absent or non-string. */
  name: string | null;
  /** Module type — null when absent (default is "commonjs"). */
  moduleType: "module" | "commonjs" | null;
  /** Raw declared `engines` map, never mutated. */
  engines: Record<string, string>;
  /** Numeric minimum Node major from `engines.node`, or null when not
   *  derivable. `>=18` → 18, `^20.10.0` → 20, `>=18 <21` → 18,
   *  `*` → null, `latest` → null. */
  minimumNodeMajor: number | null;
  /** Freshness bucket — driven by minimumNodeMajor relative to the
   *  May-2026 LTS schedule baked into `LTS_MAJOR` below. */
  nodeFreshness: NodeFreshness;
  /** Corepack-style pin like "pnpm@9.7.0" — null when absent. */
  packageManagerPin: string | null;
  /** Declared peer dependencies in stable order. */
  peerDependencies: PeerDependency[];
  /** Whether the manifest declares at least one `bin` entry — covers
   *  both `bin: "./cli.js"` (string) and `bin: { name: "./cli.js" }`
   *  (object). Phase 3.7. */
  hasBinEntry: boolean;
  /** Whether `workspaces` is declared (npm + Yarn classic) — covers
   *  both `[…]` and `{ packages: […] }` shapes. Phase 3.7. */
  hasWorkspaces: boolean;
  /** Lower-cased `keywords` for quick set membership tests. Phase 3.7. */
  keywords: string[];
  /** Names of every dependency / devDependency declared, sorted
   *  alphabetically. We do NOT try to resolve versions — the topic
   *  rules just need to ask "is `react` declared anywhere?". */
  dependencyNames: string[];
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Snapshot of the Node.js LTS state used to drive the freshness
 * bucket. Updated in May 2026 from
 * https://nodejs.org/en/about/previous-releases.
 *
 * - **Active LTS**: 24 (Krypton)
 * - **Maintenance LTS**: 22 (Jod)
 * - **EOL**: 20 (Iron, EOL March 2026), 18 (Hydrogen, EOL March 2025).
 *
 * `MIN_LTS_MAJOR` is the smallest still-supported LTS — anything
 * below that is `aging` or worse.
 */
const MIN_LTS_MAJOR = 22;

/** Below this we call it `ancient` instead of merely `aging`. */
const PRE_LTS_THRESHOLD = 16;

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

interface RawPackageJson {
  name?: unknown;
  type?: string;
  packageManager?: string;
  engines?: Record<string, unknown>;
  peerDependencies?: Record<string, unknown>;
  peerDependenciesMeta?: Record<string, { optional?: unknown } | undefined>;
  bin?: unknown;
  workspaces?: unknown;
  keywords?: unknown;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
}

/** Find `package.json` in the classified file map and decode its
 *  manifest contract fields. Returns null when the file is missing or
 *  the JSON is malformed — anything else returns a structured shape. */
export function readManifest(classified: ClassifiedFiles): ParsedManifest | null {
  const file =
    classified.importantFileMap.get("package.json") ??
    classified.importantFileMap.get("package.json".toLowerCase());
  if (!file?.content) return null;
  const raw = tryParseJson<RawPackageJson>(file.content);
  if (!raw || typeof raw !== "object") return null;
  return parseManifestObject(raw);
}

/** Pure extractor — takes a parsed JSON object and returns the
 *  normalized manifest. Exposed so tests don't need a fake
 *  `ClassifiedFiles` to exercise the logic. */
export function parseManifestObject(raw: RawPackageJson): ParsedManifest {
  // module type
  let moduleType: ParsedManifest["moduleType"] = null;
  if (raw.type === "module" || raw.type === "commonjs") moduleType = raw.type;

  // engines map — drop non-string values gracefully.
  // Phase 7.x — safeDict + safeAssign closes the
  // js/remote-property-injection CodeQL finding: the user-controlled
  // `package.json` key `__proto__` (or `constructor`) is rejected by
  // safeAssign's forbidden-key check, and the underlying object has
  // no prototype to pollute.
  const engines = createSafeDict<string>();
  if (raw.engines && typeof raw.engines === "object") {
    for (const [k, v] of Object.entries(raw.engines)) {
      if (typeof v === "string" && v.trim()) safeAssign(engines, k, v.trim());
    }
  }

  const minimumNodeMajor = engines.node
    ? minimumMajorFromRange(engines.node)
    : null;
  const nodeFreshness = bucketNodeFreshness(engines.node, minimumNodeMajor);

  // packageManager (Corepack pin).
  const packageManagerPin =
    typeof raw.packageManager === "string" && raw.packageManager.trim()
      ? raw.packageManager.trim()
      : null;

  // peerDependencies + meta.
  const meta = raw.peerDependenciesMeta ?? {};
  const peerDependencies: PeerDependency[] = [];
  if (raw.peerDependencies && typeof raw.peerDependencies === "object") {
    for (const [name, range] of Object.entries(raw.peerDependencies)) {
      if (typeof range !== "string") continue;
      const m = meta[name];
      const optional = !!(
        m && typeof m === "object" && (m as { optional?: unknown }).optional
      );
      peerDependencies.push({ name, range: range.trim(), optional });
    }
  }
  // Stable, alphabetical-by-name order so the UI renders consistently
  // across audits.
  peerDependencies.sort((a, b) => a.name.localeCompare(b.name));

  // Phase 3.7 fields — kept here so the topic-rules engine doesn't
  // need to re-parse the JSON. Each guard tolerates the shape variants
  // npm itself accepts.
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name : null;

  const hasBinEntry =
    (typeof raw.bin === "string" && raw.bin.trim().length > 0) ||
    (raw.bin !== null &&
      typeof raw.bin === "object" &&
      Object.keys(raw.bin as Record<string, unknown>).length > 0);

  const hasWorkspaces =
    (Array.isArray(raw.workspaces) && raw.workspaces.length > 0) ||
    (raw.workspaces !== null &&
      typeof raw.workspaces === "object" &&
      Array.isArray(
        (raw.workspaces as { packages?: unknown }).packages,
      ) &&
      ((raw.workspaces as { packages: unknown[] }).packages.length > 0));

  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.toLowerCase())
    : [];

  const depNames = new Set<string>();
  for (const map of [raw.dependencies, raw.devDependencies]) {
    if (map && typeof map === "object") {
      for (const k of Object.keys(map)) depNames.add(k);
    }
  }
  const dependencyNames = Array.from(depNames).sort();

  return {
    name,
    moduleType,
    engines,
    minimumNodeMajor,
    nodeFreshness,
    packageManagerPin,
    peerDependencies,
    hasBinEntry,
    hasWorkspaces,
    keywords,
    dependencyNames,
  };
}

/* -------------------------------------------------------------------------- */
/* Range → minimum major                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Return the smallest major version implied by an `engines.node`
 * range. Handles the common forms; falls back to null on anything
 * exotic so the audit just reports "any version" rather than
 * mis-grading.
 *
 * Supported:
 *   `*`, `>=`, `>`, `~`, `^`, `=`, plain `18`, `18.0.0`, comma /
 *   whitespace ranges (`>=18 <21`), OR ranges (`16 || 18 || 20`).
 *
 * Not supported (returns null):
 *   pre-release tags (`>=18.0.0-rc`), `latest`, `current`, the empty
 *   string.
 */
export function minimumMajorFromRange(range: string): number | null {
  const r = range.trim();
  if (!r || r === "*" || r === "x" || r === "latest" || r === "current") {
    return null;
  }
  // `||` splits OR-clauses → take the smallest major from each clause.
  const clauses = r.split("||").map((c) => c.trim()).filter(Boolean);
  let best: number | null = null;
  for (const clause of clauses) {
    const local = smallestMajorFromAndClause(clause);
    if (local !== null && (best === null || local < best)) best = local;
  }
  return best;
}

function smallestMajorFromAndClause(clause: string): number | null {
  // The clause may have multiple comparators (`>=18 <21`). Pull every
  // version-like token and pick the smallest one whose comparator is
  // compatible with "this is the minimum".
  const tokens = clause.split(/\s+/).filter(Boolean);
  let candidate: number | null = null;
  for (const tok of tokens) {
    const m = tok.match(/^([\^~>=<]?=?|=)?\s*v?(\d+)(?:\.\d+)?(?:\.\d+)?/);
    if (!m) continue;
    const op = (m[1] ?? "").trim();
    const major = Number(m[2]);
    if (!Number.isFinite(major)) continue;
    // `<X` and `<=X` are upper bounds — they don't define a minimum.
    if (op === "<" || op === "<=") continue;
    if (candidate === null || major < candidate) candidate = major;
  }
  return candidate;
}

/* -------------------------------------------------------------------------- */
/* Freshness bucket                                                            */
/* -------------------------------------------------------------------------- */

function bucketNodeFreshness(
  raw: string | undefined,
  minimumMajor: number | null,
): NodeFreshness {
  if (!raw) return "missing";
  const r = raw.trim();
  if (r === "*" || r === "x" || r === "latest" || r === "current") return "any";
  if (minimumMajor === null) return "any";
  if (minimumMajor < PRE_LTS_THRESHOLD) return "ancient";
  if (minimumMajor < MIN_LTS_MAJOR) return "aging";
  if (minimumMajor === MIN_LTS_MAJOR) return "current";
  return "modern";
}

/* -------------------------------------------------------------------------- */
/* UI helpers                                                                  */
/* -------------------------------------------------------------------------- */

const FRESHNESS_LABEL: Record<NodeFreshness, string> = {
  missing: "Node version not declared",
  any: "Node version unconstrained",
  modern: "Modern Node",
  current: "Current LTS",
  aging: "Pins an EOL Node major",
  ancient: "Pins a pre-LTS Node major",
};

export function formatNodeFreshness(f: NodeFreshness): string {
  return FRESHNESS_LABEL[f];
}
