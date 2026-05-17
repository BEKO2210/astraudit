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
  // M4.3 slice 3 — ReviewDashboard verdict header
  "dashboard.verdictBadge": "Astraudit‑Urteil",
  "dashboard.actions.similar": "Ähnliche Repos",
  "dashboard.actions.compare": "Vergleichen mit…",
  "dashboard.actions.compareDisabledTip":
    "Weiteres Audit ausführen, um Vergleich zu aktivieren",
  "dashboard.actions.reaudit": "Neu auditieren",
  "dashboard.actions.reauditTitle":
    "Cache‑Bundle verwerfen und neu von GitHub laden. Nützlich nach einem Deploy oder wenn das Dashboard einen veralteten Score zeigt.",
  "dashboard.actions.simpleMode": "Einfacher Modus",
  "dashboard.actions.simpleModeTitle":
    "Reduzierte Ansicht zeigen: Score, Klartext‑Urteil, Top‑3 Stärken + Schwächen.",
  "dashboard.actions.badge": "Badge",
  "dashboard.actions.copyVerdict": "Urteil kopieren",
  "dashboard.meta.generated": "Erstellt",
  "dashboard.meta.findingsLabel": "Funde",
  "dashboard.meta.recommendationsLabel": "Empfohlene nächste Schritte",
  "dashboard.fab.share": "Teilen",
  "dashboard.fab.print": "Als PDF speichern",
  "dashboard.fab.compare": "Vergleichen",
  "toast.share.copied": "Link in die Zwischenablage kopiert",
  "toast.share.error": "Share‑Link konnte nicht kopiert werden",
  "toast.share.errorDetail": "Die vollständige URL steht in deiner Adressleiste.",
  // M4.3 slice 4 — findings panel + card + toast region
  "panel.findings.title": "Funde",
  "panel.findings.empty": "Keine Funde entsprechen den aktuellen Filtern.",
  "severity.all": "Alle Schweregrade",
  "severity.critical": "Kritisch",
  "severity.high": "Hoch",
  "severity.medium": "Mittel",
  "severity.low": "Niedrig",
  "severity.info": "Info",
  "category.all": "Alle Kategorien",
  "category.security": "Sicherheit",
  "category.documentation": "Dokumentation",
  "category.quality": "Qualität",
  "category.ci": "CI/CD",
  "category.structure": "Struktur",
  "category.ecosystem": "Ökosystem",
  "category.maintenance": "Wartung",
  "category.dx": "DX",
  "finding.confidenceLabel": "Konfidenz",
  "finding.evidenceLabel": "Evidenz",
  "finding.recommendationLabel": "Empfehlung",
  "finding.copyDeepLink": "Link zu diesem Fund kopieren",
  "finding.copyPath": "Pfad kopieren",
  "finding.copyAllPaths": "Alle Pfade kopieren",
  "toast.regionLabel": "Benachrichtigungen",
  "toast.dismiss": "Benachrichtigung schließen",
  // M4.3 slice 5a — Settings dialog
  "settings.close": "Einstellungen schließen",
  "settings.title": "GitHub‑Zugangseinstellungen",
  "settings.subtitle": "Optional · bleibt nur in deinem Browser",
  "settings.tokenActive": "In diesem Browser ist aktuell ein Token aktiv.",
  "settings.tokenStoredAs": "Gespeichert als",
  "settings.tokenSavedAt": "gespeichert",
  "settings.tokenNone":
    "Kein Token gespeichert — öffentliches Limit von 60 Anfragen/h aktiv.",
  "settings.tokenBenefit":
    "Ein Read‑only‑Token erhöht das Limit in diesem Browser auf 5.000 Anfragen/h.",
  "settings.rateLimitTitle": "Live‑Status des GitHub‑Rate‑Limits",
  "settings.checking": "Prüfe",
  "settings.recheck": "Erneut prüfen",
  "settings.modeLabel": "Modus",
  "settings.modeAuth": "Auth",
  "settings.modePublic": "Öffentlich",
  "settings.remainingLabel": "Verbleibend",
  "settings.resetsLabel": "Reset in",
  "settings.resetsValueMin": "Min",
  "settings.probing": "Prüfe…",
  "settings.probeError": "GitHub konnte für eine Prüfung nicht erreicht werden.",
  "settings.formLabel": "Read‑only GitHub‑PAT einfügen",
  "settings.formPlaceholder": "ghp_… oder github_pat_…",
  "settings.tokenHide": "Token verbergen",
  "settings.tokenReveal": "Token anzeigen",
  "settings.save": "Speichern",
  "settings.errorEmpty": "Bitte zuerst einen Token einfügen.",
  "settings.toastSaved": "GitHub‑Token gespeichert",
  "settings.toastRemoved": "GitHub‑Token entfernt",
  "settings.toastCacheCleared": "Audit‑Cache geleert",
  "settings.scopeHint":
    "Astraudit benötigt nur den Default‑Scope public_repo (read) — gib das absolute Minimum.",
  "settings.createToken": "Fine‑grained Token erstellen",
  "settings.privacyNote":
    "Der Token verlässt diesen Browser nicht. Er wird ausschließlich als Authorization‑Header an api.github.com und raw.githubusercontent.com gesendet. Astraudit hat kein Backend, das ihn empfangen könnte.",
  "settings.removeToken": "Token entfernen",
  "settings.densityHeading": "Dichte",
  "settings.densityHint":
    "Compact reduziert Card‑Padding um ~20 % und verkleinert Body‑Text leicht. Klick‑Ziele bleiben in voller Größe.",
  "settings.densityComfortable": "Komfortabel",
  "settings.densityComfortableHint": "Originalabstand.",
  "settings.densityCompact": "Kompakt",
  "settings.densityCompactHint": "Engere Cards, kleinerer Text.",
  "settings.cacheHeading": "Audit‑Cache",
  "settings.cacheClear": "Leeren",
  "settings.cacheCount": "Audits im Cache",
  "settings.cacheTtl": "24h TTL",
  "settings.cacheMore": "weitere",
  "settings.cacheEmpty":
    "Noch keine Audits im Cache. Ein Audit innerhalb von 24 Stunden erneut auszuführen überspringt alle GitHub‑API‑Calls — nützlich, wenn du auf dem öffentlichen 60/h‑Limit unterwegs bist.",
  "settings.timeJustNow": "gerade eben",
  "settings.timeMinAgo": "Min. her",
  "settings.timeHourAgo": "Std. her",
  "settings.timeDayAgo": "Tg. her",
  // M4.3 slice 5b — Shortcuts dialog
  "shortcuts.close": "Schließen",
  "shortcuts.title": "Tastaturkürzel",
  "shortcuts.subtitle":
    "Zwei‑Tasten‑Akkorde (\"g s\") erwarten beide Tasten innerhalb von ~1 Sekunde.",
  "shortcuts.openPalette": "Command Palette öffnen",
  "shortcuts.openPaletteWinLinux":
    "Command Palette öffnen (Windows / Linux)",
  "shortcuts.focusInput": "Fokus auf Repository‑Eingabe",
  "shortcuts.showSheet": "Diese Übersicht anzeigen",
  "shortcuts.closeDialog": "Aktiven Dialog schließen",
  "shortcuts.jumpOverview": "Zur Übersicht springen",
  "shortcuts.jumpScore": "Zum Score springen",
  "shortcuts.jumpStory": "Zur Story springen",
  "shortcuts.jumpReadme": "Zur README springen",
  "shortcuts.jumpInsights": "Zu den Insights springen",
  "shortcuts.jumpGraph": "Zum Graph springen",
  "shortcuts.jumpFindings": "Zu den Funden springen",
  "shortcuts.jumpStructure": "Zur Struktur springen (Code)",
  "shortcuts.jumpStack": "Zum Stack springen",
  "shortcuts.jumpMaintenance": "Zur Wartung springen",
  "shortcuts.jumpOnboarding": "Zum Onboarding springen (Build)",
  "shortcuts.jumpNext": "Zu den nächsten Schritten springen",
  // M4.3 slice 5b — History dialog
  "history.close": "Schließen",
  "history.title": "Audit‑Verlauf",
  "history.subtitle":
    "Lokal gespeichert · Browser‑Daten löschen entfernt ihn.",
  "history.tabFavorites": "Favoriten",
  "history.tabRecent": "Zuletzt",
  "history.clearAll": "Alle löschen",
  "history.emptyFavorites":
    "Noch keine Favoriten. Stern‑Symbol an einem Audit klicken, um es oben anzupinnen.",
  "history.emptyRecent": "Noch keine Audits — dein Verlauf erscheint hier.",
  "history.favorite": "Favorit",
  "history.unfavorite": "Aus Favoriten entfernen",
  "history.remove": "Aus Verlauf entfernen",
  "history.toastCleared": "Audit‑Verlauf geleert",
};

export default DE;
