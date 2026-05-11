import type { ClassifiedFiles } from "./fileClassifier";
import { tryParseJson } from "../utils/safeText";
import { readManifest, type ParsedManifest } from "./packageManifest";

/**
 * Phase 7.0.1 — per-manifest lockfile expectations. Each tuple is
 * `[manifest filename, [acceptable lockfile names]]`. The order
 * matters in the lockfile arrays: we surface the first name as the
 * "recommended" / canonical lockfile so the audit copy is concrete
 * ("commit `Cargo.lock`") rather than generic ("commit your package
 * manager's lockfile").
 */
type ManifestKind =
  | "npm"
  | "cargo"
  | "poetry"
  | "pipenv"
  | "pdm"
  | "uv"
  | "go"
  | "composer"
  | "bundler"
  | "swift";

interface ManifestSpec {
  kind: ManifestKind;
  manifest: string;
  /** Lockfiles that satisfy this manifest's reproducible-install
   *  contract. First entry is the canonical / recommended one. */
  lockfiles: string[];
  /** Human-readable ecosystem label for the audit copy. */
  ecosystem: string;
}

const MANIFEST_SPECS: ManifestSpec[] = [
  {
    kind: "npm",
    manifest: "package.json",
    lockfiles: ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb", "bun.lock"],
    ecosystem: "npm / pnpm / yarn / bun",
  },
  { kind: "cargo", manifest: "Cargo.toml", lockfiles: ["Cargo.lock"], ecosystem: "Cargo (Rust)" },
  { kind: "poetry", manifest: "pyproject.toml", lockfiles: ["poetry.lock", "pdm.lock", "uv.lock"], ecosystem: "Poetry / PDM / uv (Python)" },
  { kind: "pipenv", manifest: "Pipfile", lockfiles: ["Pipfile.lock"], ecosystem: "Pipenv (Python)" },
  { kind: "go", manifest: "go.mod", lockfiles: ["go.sum"], ecosystem: "Go modules" },
  { kind: "composer", manifest: "composer.json", lockfiles: ["composer.lock"], ecosystem: "Composer (PHP)" },
  { kind: "bundler", manifest: "Gemfile", lockfiles: ["Gemfile.lock"], ecosystem: "Bundler (Ruby)" },
  { kind: "swift", manifest: "Package.swift", lockfiles: ["Package.resolved"], ecosystem: "Swift Package Manager" },
];

export interface MissingLockfile {
  manifest: string;
  ecosystem: string;
  /** Lockfile name(s) the maintainer should commit. The first entry
   *  is the canonical choice; alternates are listed for ecosystems
   *  with multiple supported tools (e.g. npm + pnpm + yarn). */
  expectedLockfiles: string[];
}

export interface DependencySignals {
  packageManager: string | null;
  hasLockfile: boolean;
  hasPackageJson: boolean;
  hasTypecheckScript: boolean;
  hasLintScript: boolean;
  hasFormatScript: boolean;
  hasTestScript: boolean;
  hasBuildScript: boolean;
  scriptKeys: string[];
  isTypescriptProject: boolean;
  /**
   * Parsed manifest contract (engines, peerDependencies,
   * packageManager pin, module type). Null when the file is absent
   * or unparseable. Phase 3.5.
   */
  manifest: ParsedManifest | null;
  /**
   * Phase 7.0.1 — every manifest the repo ships, with its
   * ecosystem label. Lets the audit copy say "package.json + Cargo.toml
   * monorepo" instead of just "polyglot".
   */
  manifestsPresent: Array<{ manifest: string; ecosystem: string }>;
  /**
   * Phase 7.0.1 — every (manifest present, lockfile absent) pair.
   * The risk engine emits one finding per row with stack-specific
   * copy ("Cargo.toml present but no Cargo.lock detected" vs the
   * legacy generic "commit your package manager's lockfile"). When
   * no manifest is present at all (e.g. a Linux-style header-only
   * repo), this array is empty and no lockfile finding fires.
   */
  missingLockfiles: MissingLockfile[];
}

interface PackageJson {
  scripts?: Record<string, string>;
}

export function analyzeDependencies(
  classified: ClassifiedFiles,
): DependencySignals {
  const has = classified.hasFile;
  const pkgFile =
    classified.importantFileMap.get("package.json") ??
    classified.importantFileMap.get("package.json".toLowerCase());
  const pkg = pkgFile?.content ? tryParseJson<PackageJson>(pkgFile.content) : null;
  const scripts = pkg?.scripts ?? {};
  const scriptKeys = Object.keys(scripts);

  const matchesScript = (re: RegExp) =>
    scriptKeys.some((key) => re.test(key) || re.test(scripts[key] ?? ""));

  // Phase 7.0.1 — walk every manifest spec and collect (a) present
  // manifests, (b) the pairs where the manifest is present but its
  // lockfile isn't.
  const manifestsPresent: Array<{ manifest: string; ecosystem: string }> = [];
  const missingLockfiles: MissingLockfile[] = [];
  for (const spec of MANIFEST_SPECS) {
    if (!has(spec.manifest)) continue;
    manifestsPresent.push({ manifest: spec.manifest, ecosystem: spec.ecosystem });
    const lockHit = has(...spec.lockfiles);
    if (!lockHit) {
      missingLockfiles.push({
        manifest: spec.manifest,
        ecosystem: spec.ecosystem,
        expectedLockfiles: spec.lockfiles,
      });
    }
  }

  const hasLockfile = !!has(
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    "bun.lock",
    "Cargo.lock",
    "poetry.lock",
    "pdm.lock",
    "uv.lock",
    "composer.lock",
    "Pipfile.lock",
    "go.sum",
    "Gemfile.lock",
    "Package.resolved",
  );

  let packageManager: string | null = null;
  if (has("pnpm-lock.yaml")) packageManager = "pnpm";
  else if (has("yarn.lock")) packageManager = "yarn";
  else if (has("bun.lockb", "bun.lock")) packageManager = "bun";
  else if (has("package-lock.json")) packageManager = "npm";
  else if (has("Cargo.lock")) packageManager = "cargo";
  else if (has("poetry.lock")) packageManager = "poetry";
  else if (has("Pipfile.lock")) packageManager = "pipenv";
  else if (has("go.sum")) packageManager = "go modules";
  else if (has("composer.lock")) packageManager = "composer";
  else if (has("Gemfile.lock")) packageManager = "bundler";

  const isTypescriptProject =
    !!has("tsconfig.json", "tsconfig.base.json") ||
    Array.from(classified.blobPathsLower.keys()).some(
      (p) => p.endsWith(".ts") || p.endsWith(".tsx"),
    );

  return {
    packageManager,
    hasLockfile,
    hasPackageJson: !!has("package.json"),
    hasTypecheckScript: matchesScript(/\b(typecheck|tsc|type-check)\b/i),
    hasLintScript: matchesScript(/\blint\b/i),
    hasFormatScript: matchesScript(/\b(format|prettier|biome)\b/i),
    hasTestScript: matchesScript(/\btest\b/i) || classified.hasTestSignals,
    hasBuildScript: matchesScript(/\bbuild\b/i),
    scriptKeys,
    isTypescriptProject,
    manifest: readManifest(classified),
    manifestsPresent,
    missingLockfiles,
  };
}
