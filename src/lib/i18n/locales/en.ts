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
};

export default EN;
