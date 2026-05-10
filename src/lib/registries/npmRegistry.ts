/**
 * npm registry fetcher — Phase 3.8.
 *
 * `https://registry.npmjs.org/{name}` is the canonical packument
 * endpoint. It supports CORS for unauthenticated reads (verified in
 * the wild — that's how `unpkg.com`, the Yarn web UI, and dozens of
 * static-site tools hit it). We never authenticate.
 *
 * Response shape (excerpt — many fields ignored):
 *   {
 *     "name": "react",
 *     "dist-tags": { "latest": "18.3.1", … },
 *     "versions": { "18.3.1": { … }, … },
 *     "time": { "modified": "…", "created": "…", "18.3.1": "…" },
 *     "homepage": "https://react.dev/",
 *     "repository": { "type": "git", "url": "…" }
 *   }
 *
 * Deprecation: an npm package marks itself deprecated by either
 * setting a top-level `deprecated` string OR by setting it on the
 * latest version. We honour both.
 *
 * Sources:
 *   - https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md
 */

import type { RegistryMetadata, RegistryOutcome } from "./types";

interface NpmPackument {
  name?: string;
  "dist-tags"?: Record<string, string>;
  time?: Record<string, string>;
  homepage?: string;
  repository?: { url?: string } | string;
  deprecated?: string;
  versions?: Record<string, { deprecated?: string } | undefined>;
}

const DEFAULT_TIMEOUT_MS = 8000;

/** URL-encode a package name so scoped packages survive the path. */
function urlForName(name: string): string {
  // npm scoped packages use a single `/` in the name. The registry
  // actually wants the `/` URL-encoded as `%2F`.
  if (name.startsWith("@")) {
    const idx = name.indexOf("/");
    if (idx > 0) {
      return `https://registry.npmjs.org/${name.slice(0, idx)}%2F${encodeURIComponent(
        name.slice(idx + 1),
      )}`;
    }
  }
  return `https://registry.npmjs.org/${encodeURIComponent(name)}`;
}

export async function fetchNpmMetadata(
  name: string,
  signal?: AbortSignal,
): Promise<RegistryOutcome> {
  const url = urlForName(name);
  let response: Response;
  try {
    response = await fetchWithTimeout(url, signal);
  } catch (err) {
    return {
      kind: "error",
      ecosystem: "npm",
      name,
      reason: (err as Error).message ?? "network error",
    };
  }

  if (response.status === 404) {
    return { kind: "not-found", ecosystem: "npm", name };
  }
  if (!response.ok) {
    return {
      kind: "error",
      ecosystem: "npm",
      name,
      reason: `HTTP ${response.status}`,
    };
  }
  let body: NpmPackument;
  try {
    body = (await response.json()) as NpmPackument;
  } catch (err) {
    return {
      kind: "error",
      ecosystem: "npm",
      name,
      reason: "non-JSON response",
    };
  }

  const latestVersion = body["dist-tags"]?.latest ?? null;
  const lastPublishedAt =
    (latestVersion && body.time?.[latestVersion]) ||
    body.time?.modified ||
    null;

  let deprecated = typeof body.deprecated === "string" && body.deprecated.length > 0;
  if (!deprecated && latestVersion) {
    const versionMeta = body.versions?.[latestVersion];
    if (versionMeta && typeof versionMeta.deprecated === "string" && versionMeta.deprecated.length > 0) {
      deprecated = true;
    }
  }

  let homepage: string | null = null;
  if (typeof body.homepage === "string") homepage = body.homepage;
  else if (body.repository) {
    homepage =
      typeof body.repository === "string"
        ? body.repository
        : body.repository.url ?? null;
  }

  const metadata: RegistryMetadata = {
    ecosystem: "npm",
    name: body.name ?? name,
    latestVersion,
    lastPublishedAt: typeof lastPublishedAt === "string" ? lastPublishedAt : null,
    deprecated,
    homepage,
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
  // Propagate an external abort.
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
