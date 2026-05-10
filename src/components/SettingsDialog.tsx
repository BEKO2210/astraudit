import { useEffect, useId, useRef, useState } from "react";
import { useDialog } from "../lib/ui/useDialog";
import {
  CheckCircle2,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Rows3,
  Rows4,
  ShieldCheck,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react";
import {
  clearToken,
  loadToken,
  loadTokenMeta,
  looksLikeGithubToken,
  saveToken,
  type TokenMeta,
} from "../lib/auth/tokenStore";
import { probeRateLimit, type RateLimitProbe } from "../lib/github/githubClient";
import { clearAll as clearAuditCache, getStats as getCacheStats, type CacheStats } from "../lib/cache/auditCache";
import {
  applyDensity,
  loadDensity,
  saveDensity,
  type Density,
} from "../lib/density/densityStore";
import { pushToast } from "../lib/ui/toastStore";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [reveal, setReveal] = useState(false);
  const [meta, setMeta] = useState<TokenMeta | null>(null);
  const [probing, setProbing] = useState(false);
  const [probe, setProbe] = useState<RateLimitProbe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [density, setDensity] = useState<Density>("comfortable");
  const inputRef = useRef<HTMLInputElement>(null);
  const densityGroupId = useId();

  useEffect(() => {
    if (!open) return;
    setMeta(loadTokenMeta());
    setTokenInput("");
    setReveal(false);
    setError(null);
    setProbe(null);
    setCacheStats(getCacheStats());
    setDensity(loadDensity());
    void runProbe();
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleDensityChange = (next: Density) => {
    setDensity(next);
    saveDensity(next);
    applyDensity(next);
  };

  // Phase 5.3 — useDialog now handles Esc + focus trap + focus
  // restore + body scroll lock in one place. The local Esc effect
  // that used to live here is gone (the hook owns it).
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog({ open, onClose, containerRef: dialogRef, initialFocusRef: inputRef });
  const titleId = useId();

  const runProbe = async () => {
    setProbing(true);
    const p = await probeRateLimit();
    setProbe(p);
    setProbing(false);
  };

  const handleSave = async () => {
    setError(null);
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setError("Paste a token first.");
      return;
    }
    if (!looksLikeGithubToken(trimmed)) {
      setError(
        "That does not look like a GitHub token. Tokens start with ghp_ or github_pat_.",
      );
      return;
    }
    saveToken(trimmed);
    setMeta(loadTokenMeta());
    setTokenInput("");
    await runProbe();
    pushToast({
      tone: "success",
      message: "GitHub token saved",
      detail:
        "Stored only in this browser. Astraudit can now make 5,000 requests / hour.",
    });
  };

  const handleClear = () => {
    clearToken();
    setMeta(null);
    setProbe(null);
    void runProbe();
    pushToast({
      tone: "info",
      message: "GitHub token removed",
      detail: "Back to the public 60 req/h limit.",
    });
  };

  const handleClearCache = () => {
    const before = getCacheStats();
    clearAuditCache();
    setCacheStats(getCacheStats());
    if (before.count > 0) {
      pushToast({
        tone: "success",
        message: "Audit cache cleared",
        detail: `${before.count} cached audit${before.count === 1 ? "" : "s"} dropped (~${before.sizeKB} KB freed).`,
      });
    }
  };

  if (!open) return null;

  const hasToken = !!loadToken();

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="bottom-sheet-card glass-strong relative w-full max-w-lg rounded-2xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <KeyRound className="h-4 w-4 text-aurora-mint" />
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-white">
              GitHub access settings
            </h2>
            <p className="text-xs text-slate-500">
              Optional · stays in your browser only
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-slate-300/90">
          {hasToken ? (
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-aurora-mint" />
              <div>
                <p className="font-medium text-white">
                  A token is currently active in this browser.
                </p>
                <p className="text-xs text-slate-400">
                  Stored as{" "}
                  <code className="font-mono text-slate-300">
                    {meta?.prefix ?? "??"}…
                  </code>
                  {meta
                    ? ` · saved ${new Date(meta.savedAt).toLocaleString()}`
                    : ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="font-medium text-white">
                  No token saved — using public 60 req/h limit.
                </p>
                <p className="text-xs text-slate-400">
                  Adding a read-only token raises the rate to 5,000 req/h
                  in this browser.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span>Live GitHub rate-limit status</span>
            <button
              type="button"
              onClick={runProbe}
              disabled={probing}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/[0.06] disabled:opacity-60"
            >
              {probing ? (
                <Loader2 className="h-3 w-3 motion-safe:animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {probing ? "Checking" : "Re-check"}
            </button>
          </div>
          {probe ? (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Stat label="Mode" value={probe.authenticated ? "Auth" : "Public"} />
              <Stat
                label="Remaining"
                value={`${probe.remaining}/${probe.limit}`}
              />
              <Stat
                label="Resets in"
                value={`${Math.floor(probe.resetSeconds / 60)} min`}
              />
            </div>
          ) : (
            <p className="mt-1 text-slate-500">
              {probing ? "Probing…" : "Could not reach GitHub for a probe."}
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
          className="mt-4"
        >
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Paste a read-only GitHub PAT
          </label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type={reveal ? "text" : "password"}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_… or github_pat_…"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 pr-9 font-mono text-sm text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora-violet/60"
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? "Hide token" : "Reveal token"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-white"
              >
                {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-aurora-violet to-aurora-blue px-4 py-2 text-sm font-semibold text-white shadow-glow"
            >
              Save
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-xs text-risk-critical">{error}</p>
          ) : null}
        </form>

        <div className="mt-4 space-y-2 text-xs text-slate-400">
          <p>
            Astraudit needs only the default <em>public_repo</em> read scope —
            give it the absolute minimum.
            <a
              href="https://github.com/settings/tokens?type=beta"
              target="_blank"
              rel="noreferrer noopener"
              className="ml-1 inline-flex items-center gap-1 text-aurora-cyan hover:underline"
            >
              Create a fine-grained token
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <p className="text-slate-500">
            The token never leaves this browser. It is only sent as an
            <code className="mx-1 font-mono">Authorization</code> header to
            <code className="mx-1 font-mono">api.github.com</code> and
            <code className="mx-1 font-mono">raw.githubusercontent.com</code>.
            Astraudit has no backend that could receive it.
          </p>
        </div>

        {hasToken ? (
          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-risk-critical/30 bg-risk-critical/10 px-3 py-1.5 text-xs font-medium text-risk-critical hover:bg-risk-critical/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove token
            </button>
          </div>
        ) : null}

        {/* Density toggle (Phase 2.8.9). A radiogroup is the WAI-ARIA
            APG pattern for two mutually-exclusive view choices and
            keeps focus / announcement behaviour clean. The labels carry
            real visible text + an icon (Rows3 / Rows4 reads as "more
            rows = compact"). Click target stays well above 24×24 px
            (WCAG 2.5.8) regardless of which mode is active. */}
        <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-400">
          <div
            id={`${densityGroupId}-label`}
            className="font-medium text-white"
          >
            Density
          </div>
          <p
            id={`${densityGroupId}-desc`}
            className="mt-0.5 text-slate-500"
          >
            Compact tightens card padding ~20 % and shrinks body text
            slightly. Click targets stay full size.
          </p>
          <div
            role="radiogroup"
            aria-labelledby={`${densityGroupId}-label`}
            aria-describedby={`${densityGroupId}-desc`}
            className="mt-2 grid grid-cols-2 gap-2"
          >
            {(
              [
                {
                  key: "comfortable",
                  label: "Comfortable",
                  Icon: Rows3,
                  hint: "Original spacing.",
                },
                {
                  key: "compact",
                  label: "Compact",
                  Icon: Rows4,
                  hint: "Tighter cards, smaller text.",
                },
              ] as const
            ).map(({ key, label, Icon, hint }) => {
              const checked = density === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => handleDensityChange(key)}
                  className={`group flex min-h-[3rem] items-start gap-2 rounded-lg border px-3 py-2 text-left transition ${
                    checked
                      ? "border-aurora-violet/50 bg-aurora-violet/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      checked ? "text-aurora-violet" : "text-slate-400"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-[11px] text-slate-500">
                      {hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-400">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Database className="h-3.5 w-3.5 shrink-0 text-aurora-cyan" />
              <span className="font-medium text-white">Audit cache</span>
            </div>
            {cacheStats && cacheStats.count > 0 ? (
              <button
                type="button"
                onClick={handleClearCache}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/[0.08]"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            ) : null}
          </div>
          {cacheStats && cacheStats.count > 0 ? (
            <>
              <p className="mt-1 text-slate-400">
                {cacheStats.count} cached audit{cacheStats.count === 1 ? "" : "s"}{" "}
                · ~{cacheStats.sizeKB.toLocaleString("en-US")} KB · 24h TTL.
              </p>
              <ul className="mt-2 space-y-1">
                {cacheStats.entries.slice(0, 5).map((e) => (
                  <li
                    key={e.fullName}
                    className="flex items-center justify-between gap-2 rounded-md bg-black/20 px-2 py-1"
                  >
                    <span className="min-w-0 truncate text-slate-300">
                      {e.fullName}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {Math.round(e.sizeApprox / 1024)} KB ·{" "}
                      {timeAgo(e.cachedAt)}
                    </span>
                  </li>
                ))}
                {cacheStats.entries.length > 5 ? (
                  <li className="px-2 text-[10px] text-slate-500">
                    + {cacheStats.entries.length - 5} more
                  </li>
                ) : null}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-slate-500">
              No cached audits yet. Re-running an audit within 24 hours skips
              all GitHub API calls — useful when you are on the public
              60 req/h limit.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/5 bg-black/20 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
