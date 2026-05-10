/**
 * <RegistryPanel /> — surfaces the Phase 3.8 registry lookups.
 *
 * Hits public read-only endpoints on `registry.npmjs.org`, `pypi.org`,
 * and `crates.io` in parallel, using a localStorage TTL cache so
 * repeat visits skip the network entirely. Anything that fails (404,
 * network error, registry rate limit) shows up inline as a row hint —
 * the audit never breaks on a registry hiccup.
 *
 * Why it's mounted in the dashboard rather than the audit worker:
 *   - The audit worker is sandboxed and has no localStorage.
 *   - These lookups are a *secondary* enrichment — we want the audit
 *     itself to be available immediately, with the panel filling in
 *     as fetches come back.
 */

import {
  ExternalLink,
  Loader2,
  Network,
  PackageX,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  bucketStaleness,
  fetchRegistryMetadata,
  type PackageRequest,
  type StalenessBucket,
} from "../lib/registries";
import {
  namesFromCargoToml,
  namesFromPyproject,
  namesFromRequirementsTxt,
} from "../lib/registries/extractDependencyNames";
import type {
  RegistryEcosystem,
  RegistryMetadata,
  RegistryOutcome,
} from "../lib/registries/types";
import type { ParsedManifest } from "../lib/audit/packageManifest";
import type { ImportantFile } from "../types/github";

interface Props {
  manifest: ParsedManifest | null;
  importantFiles: ImportantFile[];
}

const STALENESS_COLOR: Record<StalenessBucket, string> = {
  fresh: "border-aurora-mint/40 bg-aurora-mint/10 text-aurora-mint",
  recent: "border-aurora-cyan/40 bg-aurora-cyan/10 text-aurora-cyan",
  stale: "border-aurora-amber/40 bg-aurora-amber/10 text-aurora-amber",
  abandoned: "border-risk-medium/40 bg-risk-medium/10 text-risk-medium",
};

const ECOSYSTEM_LABEL: Record<RegistryEcosystem, string> = {
  npm: "npm",
  pypi: "PyPI",
  crates: "crates.io",
};

const REGISTRY_HOMEPAGE: Record<RegistryEcosystem, string> = {
  npm: "https://www.npmjs.com/package/",
  pypi: "https://pypi.org/project/",
  crates: "https://crates.io/crates/",
};

/* -------------------------------------------------------------------------- */

function findImportantFile(
  files: ImportantFile[],
  ...names: string[]
): ImportantFile | null {
  const lookup = new Set(names.map((n) => n.toLowerCase()));
  return files.find((f) => lookup.has(f.path.toLowerCase())) ?? null;
}

/**
 * Build a list of ordered registry requests from the parsed manifest
 * (npm) and any Python / Rust manifest files in the bundle. Each
 * ecosystem is capped at its top-N so a monorepo with hundreds of
 * deps can't fan out into a denial-of-service for the registries.
 */
function buildRequests(
  manifest: ParsedManifest | null,
  importantFiles: ImportantFile[],
): PackageRequest[] {
  const out: PackageRequest[] = [];
  const seen = new Set<string>();
  const push = (ecosystem: RegistryEcosystem, name: string, capPerEcosystem: number) => {
    const key = `${ecosystem}:${name.toLowerCase()}`;
    if (seen.has(key)) return;
    const tally = out.filter((r) => r.ecosystem === ecosystem).length;
    if (tally >= capPerEcosystem) return;
    seen.add(key);
    out.push({ ecosystem, name });
  };

  // npm — first 12 names from the parsed manifest.
  if (manifest) {
    for (const n of manifest.dependencyNames) push("npm", n, 12);
  }

  // Python — requirements.txt + pyproject.toml.
  const requirements = findImportantFile(importantFiles, "requirements.txt");
  if (requirements?.content) {
    for (const n of namesFromRequirementsTxt(requirements.content)) {
      push("pypi", n, 10);
    }
  }
  const pyproject = findImportantFile(importantFiles, "pyproject.toml");
  if (pyproject?.content) {
    for (const n of namesFromPyproject(pyproject.content)) {
      push("pypi", n, 10);
    }
  }

  // Rust — Cargo.toml.
  const cargo = findImportantFile(importantFiles, "Cargo.toml");
  if (cargo?.content) {
    for (const n of namesFromCargoToml(cargo.content)) {
      push("crates", n, 10);
    }
  }

  return out;
}

/* -------------------------------------------------------------------------- */

export function RegistryPanel({ manifest, importantFiles }: Props) {
  const requests = useMemo(
    () => buildRequests(manifest, importantFiles),
    [manifest, importantFiles],
  );
  const [outcomes, setOutcomes] = useState<RegistryOutcome[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setOutcomes([]);
    setDone(false);
    if (requests.length === 0) {
      setDone(true);
      return;
    }
    const controller = new AbortController();
    let alive = true;
    void fetchRegistryMetadata(requests, {
      signal: controller.signal,
      onProgress: (outcome) => {
        if (!alive) return;
        setOutcomes((prev) => [...prev, outcome]);
      },
    }).then(() => {
      if (alive) setDone(true);
    });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [requests]);

  if (requests.length === 0) return null;

  const oks = outcomes.filter(
    (o): o is Extract<RegistryOutcome, { kind: "ok" }> => o.kind === "ok",
  );
  const notFound = outcomes.filter((o) => o.kind === "not-found").length;
  const errored = outcomes.filter((o) => o.kind === "error").length;

  return (
    <section
      id="registry"
      aria-label="Public registry lookups"
      className="glass mt-6 p-5 sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-aurora-cyan" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Registry signals
          </h2>
        </div>
        <span className="text-[11px] text-slate-400">
          {done
            ? `${oks.length}/${requests.length} resolved${
                notFound > 0 ? ` · ${notFound} not found` : ""
              }${errored > 0 ? ` · ${errored} errored` : ""}`
            : `Looking up ${outcomes.length}/${requests.length}…`}
          {!done ? (
            <Loader2 className="ml-2 inline h-3 w-3 animate-spin text-slate-500" />
          ) : null}
        </span>
      </header>
      <p className="mt-1 text-xs text-slate-500">
        Pulled live from the public, unauthenticated read-only endpoints
        on <code>registry.npmjs.org</code>, <code>pypi.org</code>, and{" "}
        <code>crates.io</code>. Cached for 24 hours in your browser; no
        backend involved.
      </p>

      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {requests.map((req) => {
          const outcome = outcomes.find(
            (o) =>
              (o.kind === "ok" && o.metadata.ecosystem === req.ecosystem &&
                o.metadata.name.toLowerCase() === req.name.toLowerCase()) ||
              (o.kind !== "ok" && o.ecosystem === req.ecosystem && o.name === req.name),
          );
          return (
            <li
              key={`${req.ecosystem}:${req.name}`}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <RegistryRow ecosystem={req.ecosystem} name={req.name} outcome={outcome} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function RegistryRow({
  ecosystem,
  name,
  outcome,
}: {
  ecosystem: RegistryEcosystem;
  name: string;
  outcome: RegistryOutcome | undefined;
}) {
  const homepage = `${REGISTRY_HOMEPAGE[ecosystem]}${encodeURIComponent(name)}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {ECOSYSTEM_LABEL[ecosystem]}
            {outcome?.kind === "ok" && outcome.cached ? (
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-slate-400">
                cached
              </span>
            ) : null}
          </div>
          <a
            href={homepage}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-0.5 inline-flex items-center gap-1 break-all font-mono text-sm text-white hover:underline"
          >
            {name}
            <ExternalLink className="h-3 w-3 shrink-0 text-slate-500" />
          </a>
        </div>
        {outcome?.kind === "ok" ? <StalenessPill metadata={outcome.metadata} /> : null}
      </div>

      {!outcome ? (
        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Looking up…
        </div>
      ) : outcome.kind === "ok" ? (
        <RegistryDetails metadata={outcome.metadata} />
      ) : outcome.kind === "not-found" ? (
        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <PackageX className="h-3 w-3" />
          Not on the registry — probably a private fork or a typo.
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-slate-500">
          Lookup failed: {outcome.reason}.
        </div>
      )}
    </div>
  );
}

function StalenessPill({ metadata }: { metadata: RegistryMetadata }) {
  if (metadata.deprecated) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border border-risk-critical/40 bg-risk-critical/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-risk-critical">
        deprecated
      </span>
    );
  }
  const bucket = bucketStaleness(metadata);
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${STALENESS_COLOR[bucket]}`}
    >
      {bucket}
    </span>
  );
}

function RegistryDetails({ metadata }: { metadata: RegistryMetadata }) {
  const parts: string[] = [];
  if (metadata.latestVersion) parts.push(`v${metadata.latestVersion}`);
  if (metadata.lastPublishedAt) {
    const days = Math.max(
      0,
      Math.round(
        (Date.now() - Date.parse(metadata.lastPublishedAt)) / 86_400_000,
      ),
    );
    parts.push(
      days === 0
        ? "published today"
        : `published ${days} day${days === 1 ? "" : "s"} ago`,
    );
  }
  if (metadata.recentDownloads !== null && metadata.recentDownloads > 0) {
    parts.push(
      `${metadata.recentDownloads.toLocaleString("en-US")} downloads / 90 d`,
    );
  }
  return (
    <div className="mt-1.5 break-words text-xs text-slate-400">
      {parts.join(" · ") || "No version info returned."}
    </div>
  );
}
