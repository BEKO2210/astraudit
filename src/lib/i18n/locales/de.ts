/**
 * German catalog — Roadmap M4.2 (framework slice).
 *
 * Strings are translated as part of M4.3 (Native‑Speaker‑Review
 * via PR). Until then, the strings here are pragmatic placeholders
 * that read correctly to a German UI user without misleading them
 * about the meaning. Any string left identical to EN is marked with
 * a `// TODO M4.3:` comment so the translation pass can find them
 * with grep.
 */

import type { Catalog } from "../types";

const DE: Catalog = {
  "cta.audit": "Auditieren",
  "cta.compare": "Vergleichen mit…",
  "cta.similarRepos": "Ähnliche Repos",
  "cta.close": "Schließen",
  "cta.openFullAudit": "Vollständiges Audit öffnen →",
  "dialog.similarRepos.title": "Ähnliche Repos",
  "dialog.similarRepos.subtitle":
    "Stack‑Mates mit gleicher Sprache, überlappenden Topics, ähnlicher Größenordnung.",
  "dialog.similarRepos.loading": "Suche auf GitHub…",
  "dialog.similarRepos.empty":
    "Keine ähnlichen Repos für die aktuelle Anfrage gefunden. Repos mit deklarierten Topics + Hauptsprache liefern die besten Ergebnisse.",
  "switcher.language": "Sprache",
  // M4.3 slice 1 — Hero / header chrome
  "header.brandSubtitle": "Repository‑Analyse",
  "header.homeAria": "Astraudit Startseite",
  "header.openHistory": "Audit‑Verlauf öffnen",
  "header.auth": "Auth · 5k/h",
  "header.authShort": "Auth",
  "header.settings": "Einstellungen · öffentlich 60/h",
  "header.settingsShort": "Einstellungen",
  "header.authTitle": "Authentifizierter GitHub‑PAT aktiv",
  "header.publicRateTitle":
    "Öffentliches GitHub‑Rate‑Limit aktiv (60 Anfragen pro Stunde)",
  "header.pillBrowserOnly": "Browser‑only · keine Code‑Ausführung",
  "header.pillStatic": "Nur statische Analyse",
  "header.pillPublic": "Nur öffentliche Repos",
  "header.pillPatActive": "Lokaler PAT · bleibt im Browser",
  "header.pillPatOptional": "Optionaler PAT · nur lokal gespeichert",
  "header.pillAiMcp": "AI‑ready · MCP",
  "header.pillAiMcpTitle":
    "Astraudit bringt einen MCP‑Server mit, damit AI‑Clients (Claude Desktop, Cursor, Zed, VS Code) Audits als natives Tool ausführen können. Klicken für die Anleitung.",
};

export default DE;
