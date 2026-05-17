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
};

export default DE;
