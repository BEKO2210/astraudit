/**
 * English catalog — canonical source of truth.
 *
 * Every other locale (`de.ts`, `ja.ts`) imports the Catalog type
 * from `../types` and uses `satisfies Catalog` so missing or stray
 * keys surface at typecheck. EN is exported as `default` for the
 * loader; named export `EN` is kept so we can spot‑check key
 * coverage in unit tests without dynamic import.
 */

import type { Catalog } from "../types";

export const EN: Catalog = {
  "cta.audit": "Audit",
  "cta.compare": "Compare with…",
  "cta.similarRepos": "Similar repos",
  "cta.close": "Close",
  "cta.openFullAudit": "Open full audit →",
  "dialog.similarRepos.title": "Similar repos",
  "dialog.similarRepos.subtitle":
    "Stack‑mates with shared language, overlapping topics, similar tier.",
  "dialog.similarRepos.loading": "Searching GitHub…",
  "dialog.similarRepos.empty":
    "No similar repos surfaced from the current query. Try a repo with declared topics + a primary language for the richest results.",
  "switcher.language": "Language",
  // M4.3 slice 1 — Hero / header chrome
  "header.brandSubtitle": "Repository intelligence",
  "header.homeAria": "Astraudit home",
  "header.openHistory": "Open audit history",
  "header.auth": "Auth · 5k/h",
  "header.authShort": "Auth",
  "header.settings": "Settings · public 60/h",
  "header.settingsShort": "Settings",
  "header.authTitle": "Authenticated GitHub PAT active",
  "header.publicRateTitle":
    "Using public GitHub rate limit (60 requests per hour)",
  "header.pillBrowserOnly": "Browser‑only · No code execution",
  "header.pillStatic": "Static analysis only",
  "header.pillPublic": "Public repos only",
  "header.pillPatActive": "Local PAT · stays in your browser",
  "header.pillPatOptional": "Optional PAT · stored only locally",
  "header.pillAiMcp": "AI‑ready · MCP",
  "header.pillAiMcpTitle":
    "Astraudit ships an MCP server so AI clients (Claude Desktop, Cursor, Zed, VS Code) can run audits as a native tool. Click for the walkthrough.",
  // M4.3 slice 2 — hero marketing copy
  "hero.h1.prefix": "Should you trust this ",
  "hero.h1.brand": "public GitHub",
  "hero.h1.suffix": " repo? Find out in 30 seconds.",
  "hero.lead.prefix": "Paste a URL. ",
  "hero.lead.bold": "Get a 100‑point readiness score",
  "hero.lead.suffix":
    ", the eight signals that matter, and the fixes a maintainer would prioritize first — before you fork, depend on, or contribute. No login, no backend, no AI guesswork.",
  // M4.3 slice 2 — empty-state feature grid
  "empty.heading": "What an audit produces",
  "empty.feature1.title": "Repository story",
  "empty.feature1.body":
    "A factual summary of what the repo appears to be, derived only from public files and metadata.",
  "empty.feature2.title": "Structural audit",
  "empty.feature2.body":
    "We map directories, configs, and tests to score documentation, quality, and structure.",
  "empty.feature3.title": "Trust signals",
  "empty.feature3.body":
    "License, security policy, dependency hygiene, and CI/CD presence — without ever running any code.",
  "empty.feature4.title": "Prioritized fixes",
  "empty.feature4.body":
    "Seven concrete next steps ordered by impact across security, quality, and developer experience.",
  // M4.3 slice 2 — onboarding panel
  "onboarding.heading": "How to actually use this repository",
  "onboarding.subtitle":
    "Steps inferred from the file tree, lockfile, and detected scripts. None of these are executed by Astraudit — they are guidance for you.",
  "onboarding.emptyTitle": "No automated onboarding steps detected",
  "onboarding.emptyDescription":
    "Astraudit didn't find a recognised package manifest, lockfile, or run‑script combination to build a setup recipe from. Check the project's README — its install instructions are likely the authoritative path here.",
  "onboarding.pillOptional": "optional",
  "onboarding.pillRecommended": "recommended",
  "onboarding.copyCommand": "Copy command",
  // M4.3 slice 3 — ReviewDashboard verdict header
  "dashboard.verdictBadge": "Astraudit verdict",
  "dashboard.actions.similar": "Similar repos",
  "dashboard.actions.compare": "Compare with…",
  "dashboard.actions.compareDisabledTip":
    "Run another audit to enable comparison",
  "dashboard.actions.reaudit": "Re‑audit",
  "dashboard.actions.reauditTitle":
    "Drop the cached bundle and re‑fetch from GitHub. Useful after a deploy or when the dashboard shows a stale score.",
  "dashboard.actions.simpleMode": "Simple mode",
  "dashboard.actions.simpleModeTitle":
    "Show a stripped‑down view: score, plain‑language verdict, top three strengths and gaps.",
  "dashboard.actions.badge": "Badge",
  "dashboard.actions.copyVerdict": "Copy verdict",
  "dashboard.meta.generated": "Generated",
  "dashboard.meta.findingsLabel": "Findings",
  "dashboard.meta.recommendationsLabel": "Recommended next steps",
  "dashboard.fab.share": "Share",
  "dashboard.fab.print": "Save as PDF",
  "dashboard.fab.compare": "Compare",
  "toast.share.copied": "Link copied to clipboard",
  "toast.share.error": "Could not copy the share link",
  "toast.share.errorDetail": "The full URL is in your address bar.",
  // M4.3 slice 4 — findings panel + card + toast region
  "panel.findings.title": "Findings",
  "panel.findings.empty": "No findings match the current filters.",
  "severity.all": "All severities",
  "severity.critical": "Critical",
  "severity.high": "High",
  "severity.medium": "Medium",
  "severity.low": "Low",
  "severity.info": "Info",
  "category.all": "All categories",
  "category.security": "Security",
  "category.documentation": "Documentation",
  "category.quality": "Quality",
  "category.ci": "CI/CD",
  "category.structure": "Structure",
  "category.ecosystem": "Ecosystem",
  "category.maintenance": "Maintenance",
  "category.dx": "DX",
  "finding.confidenceLabel": "Confidence",
  "finding.evidenceLabel": "Evidence",
  "finding.recommendationLabel": "Recommendation",
  "finding.copyDeepLink": "Copy link to this finding",
  "finding.copyPath": "Copy path",
  "finding.copyAllPaths": "Copy all paths",
  "toast.regionLabel": "Notifications",
  "toast.dismiss": "Dismiss notification",
  // M4.3 slice 5a — Settings dialog
  "settings.close": "Close settings",
  "settings.title": "GitHub access settings",
  "settings.subtitle": "Optional · stays in your browser only",
  "settings.tokenActive": "A token is currently active in this browser.",
  "settings.tokenStoredAs": "Stored as",
  "settings.tokenSavedAt": "saved",
  "settings.tokenNone": "No token saved — using public 60 req/h limit.",
  "settings.tokenBenefit":
    "Adding a read‑only token raises the rate to 5,000 req/h in this browser.",
  "settings.rateLimitTitle": "Live GitHub rate‑limit status",
  "settings.checking": "Checking",
  "settings.recheck": "Re‑check",
  "settings.modeLabel": "Mode",
  "settings.modeAuth": "Auth",
  "settings.modePublic": "Public",
  "settings.remainingLabel": "Remaining",
  "settings.resetsLabel": "Resets in",
  "settings.resetsValueMin": "min",
  "settings.probing": "Probing…",
  "settings.probeError": "Could not reach GitHub for a probe.",
  "settings.formLabel": "Paste a read‑only GitHub PAT",
  "settings.formPlaceholder": "ghp_… or github_pat_…",
  "settings.tokenHide": "Hide token",
  "settings.tokenReveal": "Reveal token",
  "settings.save": "Save",
  "settings.errorEmpty": "Paste a token first.",
  "settings.toastSaved": "GitHub token saved",
  "settings.toastRemoved": "GitHub token removed",
  "settings.toastCacheCleared": "Audit cache cleared",
  "settings.scopeHint":
    "Astraudit needs only the default public_repo read scope — give it the absolute minimum.",
  "settings.createToken": "Create a fine‑grained token",
  "settings.privacyNote":
    "The token never leaves this browser. It is only sent as an Authorization header to api.github.com and raw.githubusercontent.com. Astraudit has no backend that could receive it.",
  "settings.removeToken": "Remove token",
  "settings.densityHeading": "Density",
  "settings.densityHint":
    "Compact tightens card padding ~20 % and shrinks body text slightly. Click targets stay full size.",
  "settings.densityComfortable": "Comfortable",
  "settings.densityComfortableHint": "Original spacing.",
  "settings.densityCompact": "Compact",
  "settings.densityCompactHint": "Tighter cards, smaller text.",
  "settings.cacheHeading": "Audit cache",
  "settings.cacheClear": "Clear",
  "settings.cacheCount": "cached audits",
  "settings.cacheTtl": "24h TTL",
  "settings.cacheMore": "more",
  "settings.cacheEmpty":
    "No cached audits yet. Re‑running an audit within 24 hours skips all GitHub API calls — useful when you are on the public 60 req/h limit.",
  "settings.timeJustNow": "just now",
  "settings.timeMinAgo": "min ago",
  "settings.timeHourAgo": "h ago",
  "settings.timeDayAgo": "d ago",
};

export default EN;
