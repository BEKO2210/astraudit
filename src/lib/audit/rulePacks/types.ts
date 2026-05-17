/**
 * Rule‑pack types — Roadmap Monat 5.
 *
 * Rule packs are opt‑in detector families. They never run by
 * default; the user enables them per session via the URL flag
 *   `?rules=a11y,i18n,ts,monorepo`
 * (or via the Settings dialog once M5.5 lands — the URL flag is
 * still the source of truth for shareability).
 *
 * This file only defines the type surface. The actual pack
 * implementations live in `./packs/<id>.ts` and register themselves
 * via `./registry.ts` once the relevant slice lands (M5.1‑M5.4).
 */

/** Canonical list of supported pack identifiers — single source of truth. */
export const RULE_PACK_IDS = ["a11y", "i18n", "ts", "monorepo"] as const;

export type RulePackId = (typeof RULE_PACK_IDS)[number];

/** Set of currently‑enabled packs. Immutable from the caller's POV. */
export type EnabledPacks = ReadonlySet<RulePackId>;

/** Empty default — used everywhere a pack list is required but none is active. */
export const NO_PACKS: EnabledPacks = new Set<RulePackId>();

/**
 * Pack metadata for the Settings UI + rule‑book docs.
 * Translation keys (`labelKey`, `descriptionKey`) resolve through
 * the i18n catalog so the labels respect the active locale.
 */
export interface RulePackMeta {
  id: RulePackId;
  /** Catalog key for the human label, e.g. "Accessibility". */
  labelKey: string;
  /** Catalog key for the one‑line description. */
  descriptionKey: string;
}
