/**
 * crates.io fetcher — Phase 3.8.
 *
 * `https://crates.io/api/v1/crates/{name}` returns the canonical
 * crate metadata. Browser-CORS-safe, no auth. crates.io is the only
 * one of the three supported registries that exposes a useful
 * `recent_downloads` (last 90 days) on the public response — a much
 * better staleness signal than total downloads.
 *
 * Response shape (excerpt):
 *   {
 *     "crate": {
 *       "id": "serde",
 *       "name": "serde",
 *       "max_version": "1.0.197",
 *       "max_stable_version": "1.0.197",
 *       "updated_at": "2024-02-19T…",
 *       "downloads": 250000000,
 *       "recent_downloads": 22000000,
 *       "repository": "https://github.com/serde-rs/serde",
 *       "homepage": "https://serde.rs/"
 *     }
 *   }
 */

import type { RegistryMetadata, RegistryOutcome } from "./types";

interface CratesResponse {
  crate?: {
    name?: string;
    max_stable_version?: string | null;
    max_version?: string | null;
    updated_at?: string;
    repository?: string | null;
    homepage?: string | null;
    recent_downloads?: number | null;
  };
  versions?: Array<{
    num?: string;
    license?: string | null;
  }>;
}

const DEFAULT_TIMEOUT_MS = 8000;

export async function fetchCratesMetadata(
  name: string,
  signal?: AbortSignal,
): Promise<RegistryOutcome> {
  const url = `https://crates.io/api/v1/crates/${encodeURIComponent(name)}`;
  let response: Response;
  try {
    response = await fetchWithTimeout(url, signal);
  } catch (err) {
    return {
      kind: "error",
      ecosystem: "crates",
      name,
      reason: (err as Error).message ?? "network error",
    };
  }
  if (response.status === 404) {
    return { kind: "not-found", ecosystem: "crates", name };
  }
  if (!response.ok) {
    return {
      kind: "error",
      ecosystem: "crates",
      name,
      reason: `HTTP ${response.status}`,
    };
  }

  let body: CratesResponse;
  try {
    body = (await response.json()) as CratesResponse;
  } catch {
    return { kind: "error", ecosystem: "crates", name, reason: "non-JSON response" };
  }
  const c = body.crate;
  if (!c) {
    return { kind: "error", ecosystem: "crates", name, reason: "malformed response" };
  }

  // Prefer the stable version when present (matches `cargo add` default).
  const latestVersion = c.max_stable_version ?? c.max_version ?? null;
  const homepage = c.homepage || c.repository || null;

  // The license lives on the matching version entry, not the crate
  // root. Find the entry whose `num` equals the picked latestVersion.
  let license: string | null = null;
  if (latestVersion && Array.isArray(body.versions)) {
    const match = body.versions.find((v) => v.num === latestVersion);
    if (match && typeof match.license === "string" && match.license.trim()) {
      license = match.license.trim();
    }
  }

  const metadata: RegistryMetadata = {
    ecosystem: "crates",
    name: c.name ?? name,
    latestVersion,
    lastPublishedAt: c.updated_at ?? null,
    deprecated: false,
    homepage,
    recentDownloads:
      typeof c.recent_downloads === "number" ? c.recent_downloads : null,
    license,
  };
  return { kind: "ok", metadata, cached: false };
}

async function fetchWithTimeout(
  url: string,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", () => controller.abort());
  }
  try {
    return await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
