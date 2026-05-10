/**
 * Public registry lookup types — Phase 3.8.
 *
 * Three free, unauthenticated, public registries that all support
 * browser CORS for read-only metadata: npm, PyPI, crates.io. We
 * normalise the response shapes into a single envelope so the UI
 * doesn't care which ecosystem a row came from.
 */

export type RegistryEcosystem = "npm" | "pypi" | "crates";

export interface RegistryMetadata {
  ecosystem: RegistryEcosystem;
  /** Package name as the registry knows it (case-preserved). */
  name: string;
  /** Latest published version, or null if the registry didn't return
   *  one (rare — usually means the package is brand-new or yanked). */
  latestVersion: string | null;
  /** ISO 8601 timestamp of the most recent publish, or null. */
  lastPublishedAt: string | null;
  /** True when the npm registry flagged the package as deprecated.
   *  PyPI and crates.io don't expose a comparable flag — we always
   *  return false there. */
  deprecated: boolean;
  /** Optional homepage / repository URL pulled from the metadata. */
  homepage: string | null;
  /** crates.io exposes a 90-day rolling download count which is a
   *  much better staleness signal than total downloads. PyPI and
   *  npm aren't exposed via free unauth endpoints, so this is only
   *  populated for crates entries. */
  recentDownloads: number | null;
}

/** Outcome envelope per package — `kind` is the discriminant. */
export type RegistryOutcome =
  | { kind: "ok"; metadata: RegistryMetadata; cached: boolean }
  | { kind: "not-found"; ecosystem: RegistryEcosystem; name: string }
  | { kind: "error"; ecosystem: RegistryEcosystem; name: string; reason: string };
