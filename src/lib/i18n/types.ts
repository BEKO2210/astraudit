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
  // Compare dialog (M4.3 slice 5c).
  "compare.close": string;
  "compare.title": string;
  "compare.leftLabelSuffix": string;
  "compare.formLabel": string;
  "compare.placeholder": string;
  "compare.submit": string;
  "compare.examplesLabel": string;
  "compare.footnote": string;
  // Badge dialog (M4.3 slice 5c).
  "badge.close": string;
  "badge.title": string;
  "badge.subtitle": string;
  "badge.styleFlat": string;
  "badge.styleFlatHint": string;
  "badge.styleAurora": string;
  "badge.styleAuroraHint": string;
  "badge.styleMinimal": string;
  "badge.styleMinimalHint": string;
  "badge.download": string;
  "badge.copySvg": string;
  "badge.markdownHeading": string;
  "badge.markdownHint": string;
  "badge.copyMarkdown": string;
  "badge.footnote": string;
  "badge.toastSaved": string;
  "badge.toastError": string;
  // Command palette (M4.3 slice 5c).
  "palette.regionLabel": string;
  "palette.searchAria": string;
  "palette.placeholder": string;
  "palette.emptyPrefix": string;
  "palette.navigateHint": string;
  "palette.selectHint": string;
  "palette.shortcutsHint": string;
  "palette.groupNavigate": string;
  "palette.groupActions": string;
  "palette.groupTheme": string;
  "palette.groupHistory": string;
  "palette.groupExamples": string;
  // Panel headings + small components (M4.3 slice 6a).
  "panel.auditGraph": string;
  "panel.signals": string;
  "panel.signalsSubtitle": string;
  "panel.repoStory": string;
  "panel.repoStorySubtitle": string;
  "panel.insights": string;
  "panel.scoreBreakdown": string;
  "panel.registry": string;
  "panel.maintenance": string;
  "panel.dependencies": string;
  "footer.builtWith": string;
  "examples.tryKnown": string;
  "input.repoAria": string;
  "input.repoPlaceholder": string;
  "graph.filterAria": string;
  "graph.loadingAria": string;
  "registry.aria": string;
  "export.formatAria": string;
  "sticky.summaryAria": string;
  "sticky.badgeAria": string;
  "heatmap.less": string;
  "heatmap.more": string;
  "recommendations.emptyTitle": string;
  "recommendations.emptyBody": string;
  "recommendations.copyAll": string;
  "recommendations.subtitle": string;
  "overview.archivedPill": string;
  "overview.forkPill": string;
  "overview.templatePill": string;
  "overview.copyUrl": string;
  "overview.copyOwnerRepo": string;
  "overview.openOnGithub": string;
  "overview.noDescription": string;
  "overview.licenseNone": string;
  "stackmates.close": string;
  "compareDashboard.copySummary": string;
  "compareDashboard.shared": string;
  // OverviewHeader Stat cards (M4.3 slice 6b).
  "overview.statStars": string;
  "overview.statForks": string;
  "overview.statWatchers": string;
  "overview.statOpenIssues": string;
  "overview.statLanguage": string;
  "overview.statLicense": string;
  "overview.statDefaultBranch": string;
  "overview.statLastPush": string;
  "overview.statCreated": string;
  "overview.statHomepage": string;
  // InsightsPanel cards.
  "insights.projectAge": string;
  "insights.starMomentum": string;
  "insights.pushFreshness": string;
  "insights.commitCadence": string;
  "insights.recentAuthors": string;
  "insights.releaseRhythm": string;
  "insights.openQueue": string;
  "insights.languageMix": string;
  "insights.fileTreeShape": string;
  "insights.ciProfile": string;
  "insights.dependabotCoverage": string;
  "insights.codeOwnership": string;
  "insights.securityPolicy": string;
  "insights.runtimeContract": string;
  "insights.changelogCadence": string;
  "insights.trustSignalScore": string;
  "insights.readmeFootprint": string;
  "insights.lastRelease": string;
  "insights.topFileTypes": string;
  "insights.topicSignals": string;
  "insights.aiAgentTooling": string;
  "insights.toolchainPinning": string;
  "insights.supplyChainTransparency": string;
  // MaintenancePanel cards.
  "maintenance.cardLastPush": string;
  "maintenance.cardReleases": string;
  "maintenance.cardOpenIssues": string;
  "maintenance.headingRecentCommits": string;
  "maintenance.copyCommitSha": string;
  "maintenance.copyTag": string;
  // DependencyPanel fields.
  "deps.fieldPrimaryLang": string;
  "deps.fieldRuntime": string;
  "deps.fieldPackageManager": string;
  "deps.fieldLockfile": string;
  "deps.fieldFrameworks": string;
  "deps.fieldBuildTools": string;
  "deps.fieldTestTools": string;
  "deps.fieldToolchainManagers": string;
  "deps.fieldPythonEcosystem": string;
  "deps.fieldSbom": string;
  "deps.fieldLintFormat": string;
  "deps.fieldAiAgentTooling": string;
  "deps.headingLanguageMix": string;
  "deps.notDetected": string;
  // FileStructurePanel.
  "fileTree.heading": string;
  "fileTree.filesMappedSuffix": string;
  "fileTree.rootFilesSuffix": string;
  "fileTree.importantPresent": string;
  "fileTree.notableMissing": string;
  "fileTree.recognizedFolders": string;
  "fileTree.suspiciousFiles": string;
  "fileTree.suspiciousFooter": string;
  "fileTree.treeTruncated": string;
  "fileTree.noneDetected": string;
  // CompareDashboard headings + paragraphs.
  "compareDashboard.perCategoryScore": string;
  "compareDashboard.findingsDiff": string;
  "compareDashboard.stackDiff": string;
  "compareDashboard.quickVerdict": string;
  "compareDashboard.onlyInLeft": string;
  "compareDashboard.onlyInRight": string;
  "compareDashboard.noneShort": string;
  // TopicChecks panel.
  "topicChecks.aria": string;
  "topicChecks.emptyTitle": string;
  "topicChecks.emptyDescription": string;
  "topicChecks.heading": string;
  "topicChecks.metSuffix": string;
  "topicChecks.partialSuffix": string;
  "topicChecks.missingSuffix": string;
  "topicChecks.intro": string;
  "topicChecks.hintLabel": string;
  // ReadmePreview heading + body.
  "panel.readmePreview": string;
  "readmePreview.noReadme": string;
  "readmePreview.noReadmeHint": string;
  "readmePreview.showLess": string;
  "readmePreview.showMore": string;
  "readmePreview.viewFullReadme": string;
  "readmePreview.renderedSafelyPrefix": string;
  // App.tsx errors + skeleton labels.
  "app.tryDifferentRepo": string;
  "app.invalidInput": string;
  "app.workerNotReady": string;
  "app.pickDifferent": string;
  "app.runSingleFirst": string;
  "app.compareFailed": string;
  "app.auditFailed": string;
  "app.workerNotReadyMsg": string;
  "app.workerNotReadyCompareMsg": string;
  "app.retry": string;
  "skeleton.loadingRuleBook": string;
  "skeleton.loadingScope": string;
  "skeleton.loadingBookmarklet": string;
  "skeleton.loadingCompare": string;
  "skeleton.loadingLeaderboard": string;
  // M5.1 — rule pack metadata.
  "rulePacks.activeLabel": string;
  "rulePacks.a11y.label": string;
  "rulePacks.a11y.description": string;
  "rulePacks.i18n.label": string;
  "rulePacks.i18n.description": string;
  "rulePacks.ts.label": string;
  "rulePacks.ts.description": string;
  "rulePacks.monorepo.label": string;
  "rulePacks.monorepo.description": string;
  // M5.5 — Settings dialog rule‑pack toggles.
  "settings.rulePacksHeading": string;
  "settings.rulePacksHint": string;
  "settings.rulePacksReauditToast": string;
  // M6.3 — Leaderboard page.
  "leaderboard.heading": string;
  "leaderboard.intro": string;
  "leaderboard.filterLanguage": string;
  "leaderboard.filterLanguagePlaceholder": string;
  "leaderboard.filterTopic": string;
  "leaderboard.filterTopicPlaceholder": string;
  "leaderboard.filterMinStars": string;
  "leaderboard.filterLimit": string;
  "leaderboard.start": string;
  "leaderboard.cancel": string;
  "leaderboard.reset": string;
  "leaderboard.preflightLow": string;
  "leaderboard.rateLimitHit": string;
  "leaderboard.tableRank": string;
  "leaderboard.tableRepo": string;
  "leaderboard.tableScore": string;
  "leaderboard.tableGrade": string;
  "leaderboard.tableStars": string;
  "leaderboard.tableLastPushed": string;
  "leaderboard.tableActions": string;
  "leaderboard.openAudit": string;
  "leaderboard.progressLabel": string;
  "leaderboard.progressDone": string;
  "leaderboard.emptyHint": string;
  "leaderboard.errorRow": string;
  "leaderboard.snapshotLabel": string;
  // M6.5 — trend pills.
  "leaderboard.tableTrend": string;
  "leaderboard.trendNew": string;
  "leaderboard.trendDropped": string;
  // M7.1.2 — Watch this repo.
  "sticky.watch": string;
  "sticky.watching": string;
  "sticky.watchAria": string;
  "sticky.unwatchAria": string;
  "sticky.watchAdded": string;
  "sticky.watchRemoved": string;
  "header.openWatched": string;
  "watched.title": string;
  "watched.subtitle": string;
  "watched.empty": string;
  "watched.close": string;
  "watched.unwatch": string;
  "watched.scoreLabel": string;
  "watched.gradeLabel": string;
  "watched.findingsLabel": string;
  "watched.lastCheckedPrefix": string;
  "watched.neverChecked": string;
  "watched.intervalPrefix": string;
  // M7.1.4 — Watch inbox.
  "header.openInbox": string;
  "inbox.title": string;
  "inbox.subtitle": string;
  "inbox.close": string;
  "inbox.empty": string;
  "inbox.emptyHint": string;
  "inbox.markRead": string;
  "inbox.markAllRead": string;
  "inbox.clear": string;
  "inbox.openAudit": string;
  "inbox.allReadToast": string;
  "inbox.clearedToast": string;
  "inbox.kindScoreUp": string;
  "inbox.kindScoreDown": string;
  "inbox.kindFindingsUp": string;
  "inbox.kindFindingsDown": string;
  "inbox.kindGradeChanged": string;
  // M7.2 — Keymap editor.
  "settings.keymapHeading": string;
  "settings.keymapHint": string;
  "settings.keymapActionPalette": string;
  "settings.keymapActionCheatSheet": string;
  "settings.keymapActionFocusInput": string;
  "settings.keymapRecord": string;
  "settings.keymapRecording": string;
  "settings.keymapReset": string;
  "settings.keymapResetAll": string;
  "settings.keymapConflictPrefix": string;
  "settings.keymapSavedToast": string;
  "settings.keymapResetToast": string;
  // M8.2 — Promo card menu.
  "promo.label": string;
  "promo.menuAria": string;
  "promo.downloadSvg": string;
  "promo.downloadPng": string;
  "promo.copyMeta": string;
  "promo.svgSavedToast": string;
  "promo.pngSavedToast": string;
  "promo.pngFailedToast": string;
  "promo.metaCopiedToast": string;
  "promo.metaFailedToast": string;
  // M8.3 — Share-to-community menu.
  "share.label": string;
  "share.menuAria": string;
  "share.copyAria": string;
  "share.openAria": string;
  "share.open": string;
  "share.copiedToast": string;
  "share.copyFailedToast": string;
}

/**
 * Translation key union, derived from the Catalog shape so a
 * `t("nope")` call fails at typecheck instead of at runtime.
 */
export type TranslationKey = keyof Catalog;
