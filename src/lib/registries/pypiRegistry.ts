/**
 * PyPI Warehouse fetcher — Phase 3.8.
 *
 * `https://pypi.org/pypi/{name}/json` returns a JSON document with
 * project metadata + every release's upload data. Browser-CORS-safe,
 * no auth.
 *
 * Response shape (excerpt):
 *   {
 *     "info": { "name": "Django", "version": "5.0.1",
 *               "home_page": "https://www.djangoproject.com/",
 *               "project_url": "https://pypi.org/project/Django/" },
 *     "releases": {
 *       "5.0.1": [{ "upload_time_iso_8601": "2024-…", … }],
 *       "5.0.0": [{ "upload_time_iso_8601": "2023-…", … }]
 *     }
 *   }
 *
 * Sources:
 *   - https://docs.pypi.org/api/json/
 */

import type { RegistryMetadata, RegistryOutcome } from "./types";

interface PypiResponse {
  info?: {
    name?: string;
    version?: string;
    home_page?: string;
    project_url?: string;
    project_urls?: Record<string, string>;
  };
  releases?: Record<
    string,
    Array<{ upload_time_iso_8601?: string }> | undefined
  >;
}

const DEFAULT_TIMEOUT_MS = 8000;

export async function fetchPypiMetadata(
  name: string,
  signal?: AbortSignal,
): Promise<RegistryOutcome> {
  const url = `https://pypi.org/pypi/${encodeURIComponent(name)}/json`;
  let response: Response;
  try {
    response = await fetchWithTimeout(url, signal);
  } catch (err) {
    return {
      kind: "error",
      ecosystem: "pypi",
      name,
      reason: (err as Error).message ?? "network error",
    };
  }
  if (response.status === 404) return { kind: "not-found", ecosystem: "pypi", name };
  if (!response.ok) {
    return {
      kind: "error",
      ecosystem: "pypi",
      name,
      reason: `HTTP ${response.status}`,
    };
  }

  let body: PypiResponse;
  try {
    body = (await response.json()) as PypiResponse;
  } catch {
    return { kind: "error", ecosystem: "pypi", name, reason: "non-JSON response" };
  }

  const latestVersion = body.info?.version ?? null;
  let lastPublishedAt: string | null = null;
  if (latestVersion && body.releases?.[latestVersion]?.[0]?.upload_time_iso_8601) {
    lastPublishedAt = body.releases[latestVersion]![0].upload_time_iso_8601!;
  } else if (body.releases) {
    // Fall back to the most-recent timestamp across all releases.
    let best: string | null = null;
    for (const files of Object.values(body.releases)) {
      const t = files?.[0]?.upload_time_iso_8601;
      if (t && (!best || t > best)) best = t;
    }
    lastPublishedAt = best;
  }

  const homepage =
    body.info?.home_page ||
    body.info?.project_urls?.Homepage ||
    body.info?.project_urls?.Source ||
    body.info?.project_url ||
    null;

  const metadata: RegistryMetadata = {
    ecosystem: "pypi",
    name: body.info?.name ?? name,
    latestVersion,
    lastPublishedAt,
    deprecated: false,
    homepage: typeof homepage === "string" ? homepage : null,
    recentDownloads: null,
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
