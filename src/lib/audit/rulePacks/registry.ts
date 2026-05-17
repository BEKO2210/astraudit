/**
 * Rule‑pack registry — Roadmap Monat 5.
 *
 * Central table that maps every known pack id to its UI metadata
 * (labels, descriptions). Pack rule implementations attach
 * themselves to this registry as later slices land:
 *   - M5.1 → a11y pack
 *   - M5.2 → i18n pack
 *   - M5.3 → ts pack
 *   - M5.4 → monorepo pack
 *
 * The labels resolve through the i18n catalog, so the registry
 * itself only stores translation keys; the actual strings are
 * looked up by consumers via `useTranslation()` / `t()`.
 */

import type { RulePackId, RulePackMeta } from "./types";
import { RULE_PACK_IDS } from "./types";

export const RULE_PACK_REGISTRY: Record<RulePackId, RulePackMeta> = {
  a11y: {
    id: "a11y",
    labelKey: "rulePacks.a11y.label",
    descriptionKey: "rulePacks.a11y.description",
  },
  i18n: {
    id: "i18n",
    labelKey: "rulePacks.i18n.label",
    descriptionKey: "rulePacks.i18n.description",
  },
  ts: {
    id: "ts",
    labelKey: "rulePacks.ts.label",
    descriptionKey: "rulePacks.ts.description",
  },
  monorepo: {
    id: "monorepo",
    labelKey: "rulePacks.monorepo.label",
    descriptionKey: "rulePacks.monorepo.description",
  },
};

/** Iterate every known pack in canonical order — for Settings dialogs. */
export function listRulePacks(): RulePackMeta[] {
  return RULE_PACK_IDS.map((id) => RULE_PACK_REGISTRY[id]);
}
