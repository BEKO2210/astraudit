import { Bell, Bot, Eye, History, Settings, ShieldCheck, Workflow, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { loadToken, loadTokenMeta } from "../lib/auth/tokenStore";
import { getStats as getHistoryStats } from "../lib/history/historyStore";
import { listWatched } from "../lib/watch/watchStore";
import { useTranslation } from "../lib/i18n";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

interface HeroProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenWatched: () => void;
  onOpenInbox: () => void;
  /** A tick that bumps whenever the token changes — re-renders the badge. */
  authTick: number;
  /** A tick that bumps whenever audit history changes. */
  historyTick: number;
  /** A tick that bumps whenever the watched-list changes. */
  watchedTick: number;
  /** Live unread-events count surfaced by the inbox badge. */
  inboxUnread: number;
}

export function Hero({
  onOpenSettings,
  onOpenHistory,
  onOpenWatched,
  onOpenInbox,
  authTick,
  historyTick,
  watchedTick,
  inboxUnread,
}: HeroProps) {
  const { t } = useTranslation();
  const [hasToken, setHasToken] = useState(false);
  const [prefix, setPrefix] = useState<string | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [watchedCount, setWatchedCount] = useState(0);

  useEffect(() => {
    setHasToken(!!loadToken());
    setPrefix(loadTokenMeta()?.prefix ?? null);
  }, [authTick]);

  useEffect(() => {
    const stats = getHistoryStats();
    setHistoryCount(stats.total);
    setFavoritesCount(stats.favorites);
  }, [historyTick]);

  useEffect(() => {
    setWatchedCount(listWatched().length);
  }, [watchedTick]);

  return (
    <header className="relative pt-10 pb-8 sm:pt-16 sm:pb-14">
      {/* Phase 5.2 — at narrow widths (tested at 360px Android),
          the brand cluster + ThemeToggle + Settings + History row
          summed to slightly more than the available content width.
          `flex-wrap` lets the action cluster fall to a second line
          on tight viewports instead of pushing the page wider than
          the body. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <a
            href={`${import.meta.env.BASE_URL}#`}
            aria-label={t("header.homeAria")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/10 transition hover:ring-aurora-violet/40"
          >
            {/* WebP first, PNG fallback. Both files are 256×256 —
                the original 3464×3464 / 5 MB asset went from
                blocking-the-page to 10 KB. The PNG is the
                fallback for browsers that lack WebP (none of the
                evergreens we target, but defensive). */}
            <picture>
              <source
                srcSet={`${import.meta.env.BASE_URL}Logo_bg_removed.webp`}
                type="image/webp"
              />
              <img
                src={`${import.meta.env.BASE_URL}Logo_bg_removed.png`}
                alt=""
                width={36}
                height={36}
                decoding="async"
                loading="eager"
                className="h-9 w-9 rounded-xl object-contain"
              />
            </picture>
          </a>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-wider text-white/90">
              Astraudit
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {t("header.brandSubtitle")}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
          {historyCount > 0 ? (
            <button
              type="button"
              onClick={onOpenHistory}
              aria-label={t("header.openHistory")}
              title={`History: ${historyCount}${
                favoritesCount > 0 ? ` · favorites: ${favoritesCount}` : ""
              }`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-400 transition hover:border-white/20 hover:text-white print:hidden"
            >
              <History className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">
                History · {historyCount}
              </span>
              <span className="sm:hidden">{historyCount}</span>
            </button>
          ) : null}
          {watchedCount > 0 ? (
            <button
              type="button"
              onClick={onOpenWatched}
              aria-label={t("header.openWatched")}
              title={`${t("watched.title")}: ${watchedCount}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-aurora-amber/40 bg-aurora-amber/10 px-2.5 py-1 text-[11px] font-medium text-aurora-amber transition hover:bg-aurora-amber/20 print:hidden"
            >
              <Eye className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">
                {t("watched.title")} · {watchedCount}
              </span>
              <span className="sm:hidden">{watchedCount}</span>
            </button>
          ) : null}
          {inboxUnread > 0 ? (
            <button
              type="button"
              onClick={onOpenInbox}
              aria-label={t("header.openInbox")}
              title={`${t("inbox.title")}: ${inboxUnread}`}
              className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full border border-aurora-violet/40 bg-aurora-violet/10 px-2.5 py-1 text-[11px] font-medium text-aurora-violet transition hover:bg-aurora-violet/20 print:hidden"
            >
              <Bell className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">
                {t("inbox.title")} · {inboxUnread}
              </span>
              <span className="sm:hidden">{inboxUnread}</span>
            </button>
          ) : null}
        <button
          type="button"
          onClick={onOpenSettings}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition print:hidden ${
            hasToken
              ? "border-aurora-mint/40 bg-aurora-mint/10 text-aurora-mint hover:bg-aurora-mint/20"
              : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
          }`}
          // The visible text already names the action ("Settings · …"),
          // so we let it serve as the accessible name. Setting
          // aria-label here would mismatch the visible text and
          // trigger Lighthouse's `label-content-name-mismatch` rule.
          // Phase 4.2.
          title={
            hasToken
              ? `${t("header.authTitle")}${prefix ? ` — prefix ${prefix}` : ""}`
              : t("header.publicRateTitle")
          }
        >
          {hasToken ? (
            <>
              <Zap className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">{t("header.auth")}</span>
              <span className="sm:hidden">{t("header.authShort")}</span>
              {prefix ? (
                <span className="hidden font-mono md:inline">{prefix}…</span>
              ) : null}
            </>
          ) : (
            <>
              <Settings className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">{t("header.settings")}</span>
              <span className="sm:hidden">{t("header.settingsShort")}</span>
            </>
          )}
        </button>
        </div>
      </div>

      <div className="mt-10 max-w-3xl">
        <span className="pill">
          <ShieldCheck className="h-3.5 w-3.5 text-aurora-mint" />
          {t("header.pillBrowserOnly")}
        </span>
        {/* Phase 5.x — hero copy refocused on the user's decision
            moment ("should I trust this repo?") rather than the
            tool's mechanics. Lead with the OUTCOME (a 30-second
            verdict), the qualifier (public GitHub), and the
            decision context (fork / depend / contribute). The
            body sentence cites the actual outputs — score, gaps,
            fixes — so users know what to expect when they hit the
            Audit button. */}
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
          {t("hero.h1.prefix")}
          <span className="bg-gradient-to-br from-aurora-violet via-aurora-blue to-aurora-mint bg-clip-text text-transparent">
            {t("hero.h1.brand")}
          </span>
          {t("hero.h1.suffix")}
        </h1>
        <p className="mt-5 max-w-2xl text-base text-slate-300/85 sm:text-lg">
          {t("hero.lead.prefix")}
          <strong className="font-semibold text-white">
            {t("hero.lead.bold")}
          </strong>
          {t("hero.lead.suffix")}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3 text-xs text-slate-400">
        <span className="pill">
          <Workflow className="h-3.5 w-3.5 text-aurora-cyan" />
          {t("header.pillStatic")}
        </span>
        <span className="pill">
          <ShieldCheck className="h-3.5 w-3.5 text-aurora-mint" />
          {t("header.pillPublic")}
        </span>
        <span className="pill">
          {hasToken
            ? t("header.pillPatActive")
            : t("header.pillPatOptional")}
        </span>
        <a
          href="https://github.com/BEKO2210/astraudit/blob/main/docs/mcp.md"
          target="_blank"
          rel="noreferrer"
          className="pill !py-1 transition hover:border-aurora-violet/40 hover:bg-aurora-violet/10 hover:text-aurora-violet"
          title={t("header.pillAiMcpTitle")}
        >
          <Bot className="h-3.5 w-3.5 text-aurora-violet" />
          {t("header.pillAiMcp")}
        </a>
      </div>
    </header>
  );
}
