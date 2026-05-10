/**
 * Public-registry orchestrator — Phase 3.8.
 *
 * Bundles the three ecosystem fetchers (npm + PyPI + crates.io)
 * behind a single async iterator that:
 *   1. Reads the localStorage cache first — a cached entry never
 *      hits the network.
 *   2. Limits in-flight requests to a small pool so we don't fan out
 *      hundreds of fetches at once on a monorepo.
 *   3. Stores every successful response back into the cache.
 *   4. Aborts cleanly when the caller's signal fires (typically the
 *      dashboard unmounting between audits).
 *
 * Failure is *always* per-package — one 404 or rate-limit on npm
 * never leaks into the others, and a single failure never throws.
 */

import { fetchCratesMetadata } from "./cratesRegistry";
import { fetchNpmMetadata } from "./npmRegistry";
import { fetchPypiMetadata } from "./pypiRegistry";
import { readCached, writeCached } from "./registryCache";
import type {
  RegistryEcosystem,
  RegistryMetadata,
  RegistryOutcome,
} from "./types";

export interface PackageRequest {
  ecosystem: RegistryEcosystem;
  name: string;
}

export interface RegistryFetchOptions {
  /** Cap concurrent in-flight requests. Default 6 (browser baseline). */
  concurrency?: number;
  /** Hard cap on the number of packages we'll fetch. Anything past
   *  this is silently dropped to keep the panel readable and avoid
   *  blasting the registry on a thousand-dep monorepo. Default 30. */
  maxPackages?: number;
  /** Aborts the entire fetch — typically the parent component
   *  unmounting. */
  signal?: AbortSignal;
  /** Per-package progress callback for UI streaming. */
  onProgress?: (outcome: RegistryOutcome) => void;
}

export type RegistryRecord = RegistryOutcome;

const FETCHERS: Record<
  RegistryEcosystem,
  (name: string, signal?: AbortSignal) => Promise<RegistryOutcome>
> = {
  npm: fetchNpmMetadata,
  pypi: fetchPypiMetadata,
  crates: fetchCratesMetadata,
};

/**
 * Fetch metadata for every request, honouring the cache + concurrency
 * cap. Resolves with the full ordered list of outcomes (cache hits
 * first, then live fetches in their request order).
 */
export async function fetchRegistryMetadata(
  requests: PackageRequest[],
  options: RegistryFetchOptions = {},
): Promise<RegistryRecord[]> {
  const concurrency = Math.max(1, options.concurrency ?? 6);
  const maxPackages = Math.max(0, options.maxPackages ?? 30);
  const sliced = requests.slice(0, maxPackages);

  const results: RegistryRecord[] = new Array(sliced.length);

  // First pass — serve from cache and emit progress immediately.
  const liveQueue: Array<{ idx: number; req: PackageRequest }> = [];
  for (let i = 0; i < sliced.length; i++) {
    const req = sliced[i];
    const cached = readCached(req.ecosystem, req.name);
    if (cached) {
      const record: RegistryRecord = {
        kind: "ok",
        metadata: cached,
        cached: true,
      };
      results[i] = record;
      options.onProgress?.(record);
    } else {
      liveQueue.push({ idx: i, req });
    }
  }

  // Second pass — concurrent live fetches.
  if (liveQueue.length === 0) return results;

  let nextIdx = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, liveQueue.length) },
    async () => {
      while (true) {
        if (options.signal?.aborted) return;
        const slot = nextIdx;
        if (slot >= liveQueue.length) return;
        nextIdx += 1;
        const job = liveQueue[slot];
        const fetcher = FETCHERS[job.req.ecosystem];
        const outcome = await fetcher(job.req.name, options.signal);
        if (outcome.kind === "ok") {
          writeCached(outcome.metadata);
        }
        results[job.idx] = outcome;
        options.onProgress?.(outcome);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

/* -------------------------------------------------------------------------- */
/* UI helpers                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Coarse staleness bucket for a single registry record. Drives the
 * panel's pill colour. The thresholds are deliberately generous —
 * library packages tend to publish slowly and we don't want to
 * label a perfectly fine `lodash`-style utility as "stale" the moment
 * it crosses the 6-month line.
 */
export type StalenessBucket = "fresh" | "recent" | "stale" | "abandoned";

export function bucketStaleness(
  metadata: RegistryMetadata,
  now: Date = new Date(),
): StalenessBucket {
  if (!metadata.lastPublishedAt) return "abandoned";
  const t = Date.parse(metadata.lastPublishedAt);
  if (!Number.isFinite(t)) return "abandoned";
  const days = Math.round((now.getTime() - t) / 86_400_000);
  if (days <= 90) return "fresh";
  if (days <= 365) return "recent";
  if (days <= 365 * 2) return "stale";
  return "abandoned";
}
