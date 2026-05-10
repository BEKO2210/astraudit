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
  AlertTriangle,
  ExternalLink,
  Info,
  Loader2,
  Network,
  PackageX,
  RefreshCw,
  Scale,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  analyzeLicenseTone,
  classifyLicense,
  formatLicenseCategory,
  type LicenseCategory,
  type LicenseFindingTone,
} from "../lib/audit/licenseClassifier";
import type { ImportantFile } from "../types/github";

interface Props {
  manifest: ParsedManifest | null;
  importantFiles: ImportantFile[];
  /** Repo's own SPDX id (e.g. `"MIT"`), pulled from the GitHub
   *  metadata. Drives the Phase 3.9 license-tone comparison. */
  repoLicense: string | null;
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

export function RegistryPanel({ manifest, importantFiles, repoLicense }: Props) {
  const requests = useMemo(
    () => buildRequests(manifest, importantFiles),
    [manifest, importantFiles],
  );
  const [outcomes, setOutcomes] = useState<RegistryOutcome[]>([]);
  const [done, setDone] = useState(false);
  // Phase 5.5 — bumping the retry key re-fires the fetch effect
  // even when `requests` itself hasn't changed (so a network blip
  // can be retried without leaving + returning to the audit).
  const [retryKey, setRetryKey] = useState(0);

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
  }, [requests, retryKey]);

  // Phase 3.9 — once we have any classified licenses, compute the
  // tone summary on the fly. We deliberately recompute on every
  // outcomes change so findings stream in alongside the rows.
  const oks = outcomes.filter(
    (o): o is Extract<RegistryOutcome, { kind: "ok" }> => o.kind === "ok",
  );
  const tone = useMemo(
    () =>
      analyzeLicenseTone(
        repoLicense,
        oks.map((o) => ({
          name: o.metadata.name,
          ecosystem: o.metadata.ecosystem,
          license: o.metadata.license,
        })),
      ),
    [oks, repoLicense],
  );

  // Retry handler must live above any early return (React Hooks rule).
  const handleRetry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  if (requests.length === 0) return null;

  const notFound = outcomes.filter((o) => o.kind === "not-found").length;
  const errored = outcomes.filter((o) => o.kind === "error").length;
  // Phase 5.5 — when EVERY lookup errored, surface a single banner
  // explaining the likely cause + a retry CTA, rather than letting
  // the user infer from N identical "Lookup failed" row hints.
  const allErrored = done && outcomes.length > 0 && errored === outcomes.length;

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

      {tone.findings.length > 0 || depCountsHaveSignal(tone.depCounts) ? (
        <LicenseToneSection tone={tone} />
      ) : null}

      {/* Phase 5.5 — global error banner. Surfaces a single message
          when every registry lookup failed (network blip, browser
          offline, rate limit). The retry CTA bumps a key that
          re-fires the fetch effect; cached entries (none, since they
          all errored) are skipped naturally. */}
      {allErrored ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-risk-medium/40 bg-risk-medium/10 p-3 text-xs text-risk-medium"
        >
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-risk-medium">
                Couldn't reach any registry.
              </p>
              <p className="mt-0.5 text-slate-300/85">
                All {errored} lookup{errored === 1 ? "" : "s"} failed —
                likely a network blip, an offline browser, or one of the
                registries throttling traffic. The audit itself is still
                accurate; only the registry enrichment is missing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-risk-medium/40 bg-risk-medium/10 px-3 py-1 font-medium transition hover:bg-risk-medium/20"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      ) : null}

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

/** Whether the dependency-license counts contain anything worth a
 *  visible "License mix" line — i.e. anything other than 100% unknown. */
function depCountsHaveSignal(counts: Record<LicenseCategory, number>): boolean {
  for (const [k, v] of Object.entries(counts)) {
    if (k === "unknown") continue;
    if (v > 0) return true;
  }
  return false;
}

const TONE_COLOR: Record<LicenseFindingTone, string> = {
  info: "border-aurora-cyan/40 bg-aurora-cyan/10 text-aurora-cyan",
  warning: "border-aurora-amber/40 bg-aurora-amber/10 text-aurora-amber",
  critical: "border-risk-critical/40 bg-risk-critical/10 text-risk-critical",
};
const TONE_ICON: Record<
  LicenseFindingTone,
  React.ComponentType<{ className?: string }>
> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertTriangle,
};

function LicenseToneSection({
  tone,
}: {
  tone: ReturnType<typeof analyzeLicenseTone>;
}) {
  const totalKnown = Object.entries(tone.depCounts)
    .filter(([k]) => k !== "unknown")
    .reduce((sum, [, v]) => sum + v, 0);
  const mix = (
    [
      ["permissive", tone.depCounts.permissive],
      ["weak-copyleft", tone.depCounts["weak-copyleft"]],
      ["strong-copyleft", tone.depCounts["strong-copyleft"]],
      ["public-domain", tone.depCounts["public-domain"]],
      ["proprietary", tone.depCounts.proprietary],
      ["none", tone.depCounts.none],
    ] as const
  ).filter(([, count]) => count > 0);

  return (
    <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
        <Scale className="h-3.5 w-3.5 text-aurora-violet" />
        License tone
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
        {tone.repo ? (
          <span>
            Repo: <strong className="text-white">{tone.repo.label}</strong> ·
            <span className="ml-1 text-slate-400">
              {formatLicenseCategory(tone.repo.category)}
            </span>
          </span>
        ) : (
          <span className="text-slate-400">
            Repo license not declared on GitHub.
          </span>
        )}
        {totalKnown > 0 ? (
          <span className="text-slate-500">
            · {totalKnown} dep{totalKnown === 1 ? "" : "s"} classified
          </span>
        ) : null}
      </div>
      {mix.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mix.map(([category, count]) => (
            <span
              key={category}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300"
            >
              {formatLicenseCategory(category as LicenseCategory)} · {count}
            </span>
          ))}
        </div>
      ) : null}
      {tone.findings.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {tone.findings.map((f) => {
            const Icon = TONE_ICON[f.tone];
            return (
              <li
                key={f.id}
                className={`rounded-lg border p-2.5 ${TONE_COLOR[f.tone]}`}
              >
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold">{f.title}</p>
                    <p className="mt-0.5 text-[11px] opacity-90">{f.detail}</p>
                    {f.packages.length > 0 ? (
                      <p className="mt-1 break-words font-mono text-[11px] opacity-80">
                        {f.packages.slice(0, 8).join(", ")}
                        {f.packages.length > 8
                          ? ` + ${f.packages.length - 8} more`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

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
  // Phase 3.9 — surface the classified license inline so the row is
  // legible without scrolling up to the tone summary.
  const license = classifyLicense(metadata.license);
  if (license.category !== "none") {
    parts.push(`${license.label} (${formatLicenseCategory(license.category)})`);
  }
  return (
    <div className="mt-1.5 break-words text-xs text-slate-400">
      {parts.join(" · ") || "No version info returned."}
    </div>
  );
}
