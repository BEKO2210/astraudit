import { useEffect, useId, useRef, useState } from "react";
import { useDialog } from "../lib/ui/useDialog";
import {
  CheckCircle2,
  Command,
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
  Sliders,
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
import { useTranslation, type TranslationKey } from "../lib/i18n";
import { RULE_PACK_REGISTRY } from "../lib/audit/rulePacks/registry";
import {
  RULE_PACK_IDS,
  type RulePackId,
} from "../lib/audit/rulePacks/types";
import {
  KEY_ACTIONS,
  bindingFromEvent,
  findConflict,
  formatBinding,
  getKeymap,
  resetAllBindings,
  resetBinding,
  setBinding,
  type KeyAction,
  type KeyBinding,
} from "../lib/keyboard/keymapStore";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Roadmap M5.5 — currently-active rule packs. Sourced from the
   * URL on App boot; mutated from this dialog when the user
   * toggles a pack. URL flag stays the source of truth.
   */
  enabledPacks: readonly RulePackId[];
  onChangeEnabledPacks: (next: readonly RulePackId[]) => void;
}

export function SettingsDialog({
  open,
  onClose,
  enabledPacks,
  onChangeEnabledPacks,
}: SettingsDialogProps) {
  const { t } = useTranslation();
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
      setError(t("settings.errorEmpty"));
      return;
    }
    if (!looksLikeGithubToken(trimmed)) {
      // Format-validation message is detail-heavy + reuses
      // domain-specific token prefixes ("ghp_", "github_pat_"); keep
      // it as one combined string per locale.
      setError(t("settings.errorEmpty"));
      return;
    }
    saveToken(trimmed);
    setMeta(loadTokenMeta());
    setTokenInput("");
    await runProbe();
    pushToast({ tone: "success", message: t("settings.toastSaved") });
  };

  const handleClear = () => {
    clearToken();
    setMeta(null);
    setProbe(null);
    void runProbe();
    pushToast({ tone: "info", message: t("settings.toastRemoved") });
  };

  const handleClearCache = () => {
    const before = getCacheStats();
    clearAuditCache();
    setCacheStats(getCacheStats());
    if (before.count > 0) {
      pushToast({ tone: "success", message: t("settings.toastCacheCleared") });
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
          aria-label={t("settings.close")}
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
              {t("settings.title")}
            </h2>
            <p className="text-xs text-slate-500">{t("settings.subtitle")}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-slate-300/90">
          {hasToken ? (
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-aurora-mint" />
              <div>
                <p className="font-medium text-white">
                  {t("settings.tokenActive")}
                </p>
                <p className="text-xs text-slate-400">
                  {t("settings.tokenStoredAs")}{" "}
                  <code className="font-mono text-slate-300">
                    {meta?.prefix ?? "??"}…
                  </code>
                  {meta
                    ? ` · ${t("settings.tokenSavedAt")} ${new Date(meta.savedAt).toLocaleString()}`
                    : ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="font-medium text-white">
                  {t("settings.tokenNone")}
                </p>
                <p className="text-xs text-slate-400">
                  {t("settings.tokenBenefit")}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span>{t("settings.rateLimitTitle")}</span>
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
              {probing ? t("settings.checking") : t("settings.recheck")}
            </button>
          </div>
          {probe ? (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Stat
                label={t("settings.modeLabel")}
                value={
                  probe.authenticated
                    ? t("settings.modeAuth")
                    : t("settings.modePublic")
                }
              />
              <Stat
                label={t("settings.remainingLabel")}
                value={`${probe.remaining}/${probe.limit}`}
              />
              <Stat
                label={t("settings.resetsLabel")}
                value={`${Math.floor(probe.resetSeconds / 60)} ${t("settings.resetsValueMin")}`}
              />
            </div>
          ) : (
            <p className="mt-1 text-slate-500">
              {probing ? t("settings.probing") : t("settings.probeError")}
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
            {t("settings.formLabel")}
          </label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type={reveal ? "text" : "password"}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={t("settings.formPlaceholder")}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 pr-9 font-mono text-sm text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora-violet/60"
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                aria-label={
                  reveal ? t("settings.tokenHide") : t("settings.tokenReveal")
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-white"
              >
                {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-aurora-violet to-aurora-blue px-4 py-2 text-sm font-semibold text-white shadow-glow"
            >
              {t("settings.save")}
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-xs text-risk-critical">{error}</p>
          ) : null}
        </form>

        <div className="mt-4 space-y-2 text-xs text-slate-400">
          <p>
            {t("settings.scopeHint")}
            <a
              href="https://github.com/settings/tokens?type=beta"
              target="_blank"
              rel="noreferrer noopener"
              className="ml-1 inline-flex items-center gap-1 text-aurora-cyan hover:underline"
            >
              {t("settings.createToken")}
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <p className="text-slate-500">{t("settings.privacyNote")}</p>
        </div>

        {hasToken ? (
          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-risk-critical/30 bg-risk-critical/10 px-3 py-1.5 text-xs font-medium text-risk-critical hover:bg-risk-critical/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("settings.removeToken")}
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
            {t("settings.densityHeading")}
          </div>
          <p
            id={`${densityGroupId}-desc`}
            className="mt-0.5 text-slate-500"
          >
            {t("settings.densityHint")}
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
                  key: "comfortable" as const,
                  label: t("settings.densityComfortable"),
                  Icon: Rows3,
                  hint: t("settings.densityComfortableHint"),
                },
                {
                  key: "compact" as const,
                  label: t("settings.densityCompact"),
                  Icon: Rows4,
                  hint: t("settings.densityCompactHint"),
                },
              ]
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

        {/* Roadmap M5.5 — opt‑in Rule Pack toggles. Sits below
            density (visual prefs) and above the cache (data
            controls). Each toggle is a checkbox-shaped <button> to
            keep keyboard semantics + visible focus consistent with
            the rest of the dialog. */}
        <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sliders className="h-3.5 w-3.5 shrink-0 text-aurora-violet" />
            <span className="font-medium text-white">
              {t("settings.rulePacksHeading")}
            </span>
          </div>
          <p className="mt-0.5 text-slate-500">
            {t("settings.rulePacksHint")}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {RULE_PACK_IDS.map((id) => {
              const meta = RULE_PACK_REGISTRY[id];
              const checked = enabledPacks.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => {
                    const next = checked
                      ? enabledPacks.filter((p) => p !== id)
                      : [...enabledPacks, id];
                    onChangeEnabledPacks(next);
                    pushToast({
                      tone: "info",
                      message: t("settings.rulePacksReauditToast"),
                    });
                  }}
                  className={`group flex min-h-[3rem] items-start gap-2 rounded-lg border px-3 py-2 text-left transition ${
                    checked
                      ? "border-aurora-violet/50 bg-aurora-violet/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? "border-aurora-violet bg-aurora-violet text-white"
                        : "border-white/20 bg-white/[0.04]"
                    }`}
                  >
                    {checked ? <CheckCircle2 className="h-3 w-3" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {t(meta.labelKey as TranslationKey)}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {t(meta.descriptionKey as TranslationKey)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Roadmap M7.2 — Keymap editor. Rebind the three
            single-key global shortcuts; the vim chord map stays
            hard-coded. */}
        <KeymapSection open={open} t={t} />

        <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-400">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Database className="h-3.5 w-3.5 shrink-0 text-aurora-cyan" />
              <span className="font-medium text-white">
                {t("settings.cacheHeading")}
              </span>
            </div>
            {cacheStats && cacheStats.count > 0 ? (
              <button
                type="button"
                onClick={handleClearCache}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/[0.08]"
              >
                <Trash2 className="h-3 w-3" />
                {t("settings.cacheClear")}
              </button>
            ) : null}
          </div>
          {cacheStats && cacheStats.count > 0 ? (
            <>
              <p className="mt-1 text-slate-400">
                {cacheStats.count} {t("settings.cacheCount")} · ~
                {cacheStats.sizeKB.toLocaleString("en-US")} KB ·{" "}
                {t("settings.cacheTtl")}
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
                      {timeAgo(e.cachedAt, t)}
                    </span>
                  </li>
                ))}
                {cacheStats.entries.length > 5 ? (
                  <li className="px-2 text-[10px] text-slate-500">
                    + {cacheStats.entries.length - 5} {t("settings.cacheMore")}
                  </li>
                ) : null}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-slate-500">{t("settings.cacheEmpty")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

type TFn = (key: import("../lib/i18n").TranslationKey) => string;

function timeAgo(iso: string, t: TFn): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const m = Math.floor(ms / 60_000);
  if (m < 1) return t("settings.timeJustNow");
  if (m < 60) return `${m} ${t("settings.timeMinAgo")}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${t("settings.timeHourAgo")}`;
  return `${Math.floor(h / 24)} ${t("settings.timeDayAgo")}`;
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

const ACTION_LABEL_KEY: Record<
  KeyAction,
  import("../lib/i18n").TranslationKey
> = {
  palette: "settings.keymapActionPalette",
  cheatSheet: "settings.keymapActionCheatSheet",
  focusInput: "settings.keymapActionFocusInput",
};

/**
 * Roadmap M7.2 — Keymap editor section. Lives at the bottom of
 * the Settings dialog. Recording mode listens for a single
 * keydown, validates against the conflict map, and persists via
 * setBinding. Esc cancels.
 */
function KeymapSection({
  open,
  t,
}: {
  open: boolean;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const [map, setMap] = useState<Record<KeyAction, KeyBinding>>(() => getKeymap());
  const [recording, setRecording] = useState<KeyAction | null>(null);

  // Re-read the keymap whenever the dialog opens so it reflects
  // changes made from outside (or from a previous open session).
  useEffect(() => {
    if (open) setMap(getKeymap());
  }, [open]);

  useEffect(() => {
    if (!recording) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setRecording(null);
        return;
      }
      const captured = bindingFromEvent(e);
      if (!captured) return; // modifier-only keypress; keep listening
      e.preventDefault();
      setBinding(recording, captured);
      setMap(getKeymap());
      setRecording(null);
      pushToast({ tone: "success", message: t("settings.keymapSavedToast") });
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [recording, t]);

  const handleReset = (action: KeyAction) => {
    resetBinding(action);
    setMap(getKeymap());
    pushToast({ tone: "info", message: t("settings.keymapResetToast") });
  };

  const handleResetAll = () => {
    resetAllBindings();
    setMap(getKeymap());
    pushToast({ tone: "info", message: t("settings.keymapResetToast") });
  };

  return (
    <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-400">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Command className="h-3.5 w-3.5 shrink-0 text-aurora-cyan" />
          <span className="font-medium text-white">
            {t("settings.keymapHeading")}
          </span>
        </div>
        <button
          type="button"
          onClick={handleResetAll}
          className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/[0.06]"
        >
          {t("settings.keymapResetAll")}
        </button>
      </div>
      <p className="mt-0.5 text-slate-500">{t("settings.keymapHint")}</p>
      <ul className="mt-2 space-y-1.5">
        {KEY_ACTIONS.map((action) => {
          const binding = map[action];
          const isRecording = recording === action;
          const conflict = findConflict(binding, action, map);
          return (
            <li
              key={action}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5"
            >
              <span className="min-w-0 text-slate-200">
                {t(ACTION_LABEL_KEY[action])}
                {conflict ? (
                  <span className="ml-2 text-[10px] text-risk-medium">
                    {t("settings.keymapConflictPrefix")}{" "}
                    {t(ACTION_LABEL_KEY[conflict])}
                  </span>
                ) : null}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-[11px] text-aurora-cyan">
                  {isRecording ? t("settings.keymapRecording") : formatBinding(binding)}
                </span>
                <button
                  type="button"
                  onClick={() => setRecording(isRecording ? null : action)}
                  className={`rounded-md border px-2 py-0.5 text-[11px] transition ${
                    isRecording
                      ? "border-aurora-violet/50 bg-aurora-violet/15 text-white"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                  }`}
                >
                  {t("settings.keymapRecord")}
                </button>
                <button
                  type="button"
                  onClick={() => handleReset(action)}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-400 hover:bg-white/[0.06]"
                >
                  {t("settings.keymapReset")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
