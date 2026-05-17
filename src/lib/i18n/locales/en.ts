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
};

export default EN;
