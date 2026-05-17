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
};

export default EN;
