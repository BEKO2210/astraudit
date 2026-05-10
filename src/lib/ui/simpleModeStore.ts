/**
 * Simple-mode store — Phase 5.x.
 *
 * Astraudit's full dashboard is dense by design — eight categories,
 * an interactive graph, a filterable findings list, structured
 * insights, a stack panel, etc. Power users love the density;
 * non-experts who just want a "should I trust this?" answer
 * sometimes bounce. Simple mode strips the dashboard down to:
 *
 *   - the score ring + grade
 *   - a plain-language verdict ("yes / mostly / be careful / no")
 *   - the top 3 strengths
 *   - the top 3 gaps the maintainer would prioritize
 *   - a "Show full audit" affordance to flip back any time
 *
 * Like the density + theme stores, the choice is persisted in
 * localStorage and applied on `<html>` so CSS hooks (e.g. hiding
 * the deep panels) can scope themselves with
 * `html[data-simple-mode="true"] …` if needed.
 *
 * The default is the FULL audit — Simple mode is opt-in. Non-experts
 * who land for the first time see the rich dashboard once, learn the
 * categories exist, and can choose to simplify on subsequent runs.
 */

export type SimpleMode = "off" | "on";

export const SIMPLE_MODE_STORAGE_KEY = "astraudit:simple-mode:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadSimpleMode(): SimpleMode {
  if (!isBrowser()) return "off";
  try {
    const raw = localStorage.getItem(SIMPLE_MODE_STORAGE_KEY);
    return raw === "on" ? "on" : "off";
  } catch {
    return "off";
  }
}

export function saveSimpleMode(value: SimpleMode): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(SIMPLE_MODE_STORAGE_KEY, value);
  } catch {
    /* swallow — quota / disabled storage. */
  }
}

export function applySimpleMode(value: SimpleMode): void {
  if (!isBrowser() || typeof document === "undefined") return;
  if (value === "on") {
    document.documentElement.setAttribute("data-simple-mode", "true");
  } else {
    document.documentElement.removeAttribute("data-simple-mode");
  }
}

/**
 * Subscribe to changes pushed via `setSimpleMode`. Used by React
 * components that mirror the store into local state (e.g. the
 * dashboard's full-vs-simple branch).
 */
type Listener = (value: SimpleMode) => void;
const listeners = new Set<Listener>();

export function setSimpleMode(value: SimpleMode): void {
  saveSimpleMode(value);
  applySimpleMode(value);
  for (const fn of listeners) fn(value);
}

export function subscribeSimpleMode(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
