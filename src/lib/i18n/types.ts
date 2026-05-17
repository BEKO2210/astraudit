/**
 * i18n types — Roadmap M4.2.
 *
 * The English catalog (`./locales/en.ts`) is the canonical source
 * of truth: its shape is exported from there, every other locale
 * imports it via `satisfies Catalog` so missing or stray keys
 * surface at typecheck time.
 *
 * Why a flat dot‑path API instead of `t.cta.audit`:
 *   - Easier programmatic key generation (extraction scripts, etc.)
 *   - Plays nicely with `Record<string, string>` JSON catalogs if
 *     we ever swap to those for non‑maintainer translators
 *   - Single bound function, easier to memoise + assert about
 *
 * Why locales aren't `string`:
 *   - TypeScript flags any typo at the call site (`setLocale("ed")`)
 *   - Adding a new locale = single edit in this file, then
 *     compile errors point at every place that needs updating
 */

export type Locale = "en" | "de" | "ja";

export const LOCALES: readonly Locale[] = ["en", "de", "ja"] as const;
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Human label for each locale — used by the LocaleSwitcher and any
 * future SEO `<html lang>` tooling. Kept here rather than in the
 * catalog itself so "what locales do we offer" stays answerable
 * without loading any catalog.
 */
export const LOCALE_LABELS: Record<Locale, { native: string; english: string }> = {
  en: { native: "English", english: "English" },
  de: { native: "Deutsch", english: "German" },
  ja: { native: "日本語", english: "Japanese" },
};

/**
 * Flat catalog shape. Every locale's exported `default` must match.
 * Keep keys grouped by surface (`cta.*`, `dialog.*`, `nav.*`) so
 * future contributors can locate strings without grep.
 */
export interface Catalog {
  // Call‑to‑action labels reused across the dashboard.
  "cta.audit": string;
  "cta.compare": string;
  "cta.similarRepos": string;
  "cta.close": string;
  "cta.openFullAudit": string;
  // Dialog titles + supporting copy.
  "dialog.similarRepos.title": string;
  "dialog.similarRepos.subtitle": string;
  "dialog.similarRepos.loading": string;
  "dialog.similarRepos.empty": string;
  // Locale switcher self‑label.
  "switcher.language": string;
  // Header / hero chrome (M4.3 slice 1 — Hero action buttons + pills).
  "header.brandSubtitle": string;
  "header.homeAria": string;
  "header.openHistory": string;
  "header.auth": string;
  "header.authShort": string;
  "header.settings": string;
  "header.settingsShort": string;
  "header.authTitle": string;
  "header.publicRateTitle": string;
  "header.pillBrowserOnly": string;
  "header.pillStatic": string;
  "header.pillPublic": string;
  "header.pillPatActive": string;
  "header.pillPatOptional": string;
  "header.pillAiMcp": string;
  "header.pillAiMcpTitle": string;
  // Hero h1 + lead paragraph (M4.3 slice 2 — marketing copy).
  "hero.h1.prefix": string;
  "hero.h1.brand": string;
  "hero.h1.suffix": string;
  "hero.lead.prefix": string;
  "hero.lead.bold": string;
  "hero.lead.suffix": string;
  // Empty state (pre-audit dashboard).
  "empty.heading": string;
  "empty.feature1.title": string;
  "empty.feature1.body": string;
  "empty.feature2.title": string;
  "empty.feature2.body": string;
  "empty.feature3.title": string;
  "empty.feature3.body": string;
  "empty.feature4.title": string;
  "empty.feature4.body": string;
  // Onboarding panel (post-audit "how to use this repo").
  "onboarding.heading": string;
  "onboarding.subtitle": string;
  "onboarding.emptyTitle": string;
  "onboarding.emptyDescription": string;
  "onboarding.pillOptional": string;
  "onboarding.pillRecommended": string;
  "onboarding.copyCommand": string;
  // ReviewDashboard verdict header + action buttons (M4.3 slice 3).
  "dashboard.verdictBadge": string;
  "dashboard.actions.similar": string;
  "dashboard.actions.compare": string;
  "dashboard.actions.compareDisabledTip": string;
  "dashboard.actions.reaudit": string;
  "dashboard.actions.reauditTitle": string;
  "dashboard.actions.simpleMode": string;
  "dashboard.actions.simpleModeTitle": string;
  "dashboard.actions.badge": string;
  "dashboard.actions.copyVerdict": string;
  "dashboard.meta.generated": string;
  "dashboard.meta.findingsLabel": string;
  "dashboard.meta.recommendationsLabel": string;
  "dashboard.fab.share": string;
  "dashboard.fab.print": string;
  "dashboard.fab.compare": string;
  "toast.share.copied": string;
  "toast.share.error": string;
  "toast.share.errorDetail": string;
  // Findings panel + card + Toast region (M4.3 slice 4).
  "panel.findings.title": string;
  "panel.findings.empty": string;
  "severity.all": string;
  "severity.critical": string;
  "severity.high": string;
  "severity.medium": string;
  "severity.low": string;
  "severity.info": string;
  "category.all": string;
  "category.security": string;
  "category.documentation": string;
  "category.quality": string;
  "category.ci": string;
  "category.structure": string;
  "category.ecosystem": string;
  "category.maintenance": string;
  "category.dx": string;
  "finding.confidenceLabel": string;
  "finding.evidenceLabel": string;
  "finding.recommendationLabel": string;
  "finding.copyDeepLink": string;
  "finding.copyPath": string;
  "finding.copyAllPaths": string;
  "toast.regionLabel": string;
  "toast.dismiss": string;
  // Settings dialog (M4.3 slice 5a).
  "settings.close": string;
  "settings.title": string;
  "settings.subtitle": string;
  "settings.tokenActive": string;
  "settings.tokenStoredAs": string;
  "settings.tokenSavedAt": string;
  "settings.tokenNone": string;
  "settings.tokenBenefit": string;
  "settings.rateLimitTitle": string;
  "settings.checking": string;
  "settings.recheck": string;
  "settings.modeLabel": string;
  "settings.modeAuth": string;
  "settings.modePublic": string;
  "settings.remainingLabel": string;
  "settings.resetsLabel": string;
  "settings.resetsValueMin": string;
  "settings.probing": string;
  "settings.probeError": string;
  "settings.formLabel": string;
  "settings.formPlaceholder": string;
  "settings.tokenHide": string;
  "settings.tokenReveal": string;
  "settings.save": string;
  "settings.errorEmpty": string;
  "settings.toastSaved": string;
  "settings.toastRemoved": string;
  "settings.toastCacheCleared": string;
  "settings.scopeHint": string;
  "settings.createToken": string;
  "settings.privacyNote": string;
  "settings.removeToken": string;
  "settings.densityHeading": string;
  "settings.densityHint": string;
  "settings.densityComfortable": string;
  "settings.densityComfortableHint": string;
  "settings.densityCompact": string;
  "settings.densityCompactHint": string;
  "settings.cacheHeading": string;
  "settings.cacheClear": string;
  "settings.cacheCount": string;
  "settings.cacheTtl": string;
  "settings.cacheMore": string;
  "settings.cacheEmpty": string;
  "settings.timeJustNow": string;
  "settings.timeMinAgo": string;
  "settings.timeHourAgo": string;
  "settings.timeDayAgo": string;
  // Shortcuts dialog (M4.3 slice 5b).
  "shortcuts.close": string;
  "shortcuts.title": string;
  "shortcuts.subtitle": string;
  "shortcuts.openPalette": string;
  "shortcuts.openPaletteWinLinux": string;
  "shortcuts.focusInput": string;
  "shortcuts.showSheet": string;
  "shortcuts.closeDialog": string;
  "shortcuts.jumpOverview": string;
  "shortcuts.jumpScore": string;
  "shortcuts.jumpStory": string;
  "shortcuts.jumpReadme": string;
  "shortcuts.jumpInsights": string;
  "shortcuts.jumpGraph": string;
  "shortcuts.jumpFindings": string;
  "shortcuts.jumpStructure": string;
  "shortcuts.jumpStack": string;
  "shortcuts.jumpMaintenance": string;
  "shortcuts.jumpOnboarding": string;
  "shortcuts.jumpNext": string;
  // History dialog (M4.3 slice 5b).
  "history.close": string;
  "history.title": string;
  "history.subtitle": string;
  "history.tabFavorites": string;
  "history.tabRecent": string;
  "history.clearAll": string;
  "history.emptyFavorites": string;
  "history.emptyRecent": string;
  "history.favorite": string;
  "history.unfavorite": string;
  "history.remove": string;
  "history.toastCleared": string;
}

/**
 * Translation key union, derived from the Catalog shape so a
 * `t("nope")` call fails at typecheck instead of at runtime.
 */
export type TranslationKey = keyof Catalog;
