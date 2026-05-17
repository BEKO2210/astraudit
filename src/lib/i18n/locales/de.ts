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
  // M4.3 slice 2 — hero marketing copy
  "hero.h1.prefix": "Sollten Sie diesem ",
  "hero.h1.brand": "öffentlichen GitHub",
  "hero.h1.suffix": "‑Repo vertrauen? Antwort in 30 Sekunden.",
  "hero.lead.prefix": "URL einfügen. ",
  "hero.lead.bold": "Erhalten Sie einen 100‑Punkte‑Readiness‑Score",
  "hero.lead.suffix":
    ", die acht relevanten Signale und die Fixes, die ein Maintainer zuerst angeht — bevor Sie forken, abhängen oder beitragen. Kein Login, kein Backend, kein AI‑Rätselraten.",
  // M4.3 slice 2 — empty-state feature grid
  "empty.heading": "Was ein Audit liefert",
  "empty.feature1.title": "Repository‑Story",
  "empty.feature1.body":
    "Eine faktische Zusammenfassung dessen, was das Repo zu sein scheint — abgeleitet ausschließlich aus öffentlichen Dateien und Metadaten.",
  "empty.feature2.title": "Strukturelles Audit",
  "empty.feature2.body":
    "Wir kartieren Verzeichnisse, Configs und Tests, um Dokumentation, Qualität und Struktur zu bewerten.",
  "empty.feature3.title": "Trust‑Signale",
  "empty.feature3.body":
    "Lizenz, Security Policy, Dependency‑Hygiene und CI/CD‑Präsenz — ohne jemals Code auszuführen.",
  "empty.feature4.title": "Priorisierte Fixes",
  "empty.feature4.body":
    "Sieben konkrete nächste Schritte, sortiert nach Wirkung in Security, Qualität und Developer Experience.",
  // M4.3 slice 2 — onboarding panel
  "onboarding.heading": "Wie man dieses Repository tatsächlich nutzt",
  "onboarding.subtitle":
    "Schritte abgeleitet aus Dateibaum, Lockfile und erkannten Scripts. Keiner davon wird von Astraudit ausgeführt — sie sind Hinweise für Sie.",
  "onboarding.emptyTitle": "Keine automatisierten Onboarding‑Schritte erkannt",
  "onboarding.emptyDescription":
    "Astraudit hat keine erkannte Package‑Manifest‑/Lockfile‑/Run‑Script‑Kombination gefunden, aus der sich ein Setup‑Rezept ableiten ließe. Schauen Sie ins README des Projekts — dessen Install‑Anweisungen sind hier wahrscheinlich der maßgebliche Pfad.",
  "onboarding.pillOptional": "optional",
  "onboarding.pillRecommended": "empfohlen",
  "onboarding.copyCommand": "Befehl kopieren",
};

export default DE;
