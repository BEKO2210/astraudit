/**
 * Density store — Phase 2.8.9.
 *
 * Two modes:
 *   - "comfortable" (default) — original spacing.
 *   - "compact"               — ~20 % tighter card paddings, slightly
 *                               smaller body font.
 *
 * Pre-build research (2026-05-10):
 *   - Material Design 3 / Atlassian / IBM Carbon all expose density
 *     as a *user choice*, not a viewport-driven decision. The accepted
 *     pattern is a single attribute on the document root and CSS rules
 *     scoped to it (`html[data-density="compact"] …`).
 *   - WCAG 2.2 SC 2.5.8 *Target Size (Minimum)* — interactive controls
 *     must remain ≥ 24×24 CSS px even in compact mode. We therefore
 *     reduce *padding around* cards and *font-size of body text*, but
 *     never the height of buttons / tap targets.
 *   - WCAG 2.4.7 acknowledges the trade-off: "users with visual field
 *     loss may prefer a more condensed layout while users with low
 *     vision may prefer larger." Offering a user-controlled toggle is
 *     therefore an accessibility improvement, not a regression.
 *
 * Sources:
 *   - https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
 *   - https://m3.material.io/foundations/layout/applying-layout
 *
 * The chosen mode is persisted in localStorage and reflected as a
 * `data-density="compact"` attribute on `<html>` (default has no
 * attribute, so the existing styling is unaffected).
 */

export type Density = "comfortable" | "compact";

export const DENSITY_STORAGE_KEY = "astraudit:density:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Read the saved choice from localStorage; defaults to "comfortable". */
export function loadDensity(): Density {
  if (!isBrowser()) return "comfortable";
  try {
    const v = localStorage.getItem(DENSITY_STORAGE_KEY);
    if (v === "comfortable" || v === "compact") return v;
  } catch {
    // ignore
  }
  return "comfortable";
}

/** Persist the user's choice. */
export function saveDensity(density: Density): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(DENSITY_STORAGE_KEY, density);
  } catch {
    // ignore
  }
}

/**
 * Apply by toggling the `data-density="compact"` attribute on <html>.
 * Comfortable mode removes the attribute so the cascade matches the
 * pre-2.8.9 baseline exactly.
 */
export function applyDensity(density: Density): Density {
  if (typeof document === "undefined") return density;
  if (density === "compact") {
    document.documentElement.setAttribute("data-density", "compact");
  } else {
    document.documentElement.removeAttribute("data-density");
  }
  return density;
}

/** Convenience: toggle between the two modes. */
export function toggleDensity(d: Density): Density {
  return d === "comfortable" ? "compact" : "comfortable";
}
