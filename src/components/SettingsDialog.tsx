import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMeta(loadTokenMeta());
    setTokenInput("");
    setReveal(false);
    setError(null);
    setProbe(null);
    void runProbe();
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

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
  };

  const handleClear = () => {
    clearToken();
    setMeta(null);
    setProbe(null);
    void runProbe();
  };

  if (!open) return null;

  const hasToken = !!loadToken();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="glass-strong relative w-full max-w-lg rounded-2xl p-5 sm:p-6"
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
            <h2 className="text-lg font-semibold text-white">
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
                <Loader2 className="h-3 w-3 animate-spin" />
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
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 pr-9 font-mono text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-aurora-violet/40"
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
      </div>
    </div>
  );
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
