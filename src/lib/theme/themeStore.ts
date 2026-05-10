/**
 * Theme store: dark / light / system.
 *
 * - "dark" and "light" are explicit user choices — the chosen theme is
 *   persisted in localStorage and used regardless of the OS preference.
 * - "system" honours `prefers-color-scheme` and re-resolves whenever
 *   the OS preference changes.
 *
 * The resolved theme is reflected as a `data-theme="light"` attribute
 * on `<html>`. Default (no attribute) is dark — the existing styling
 * is the dark mode, so there's no migration cost.
 */

export type Theme = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "astraudit:theme:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Read the saved choice from localStorage; falls back to "system". */
export function loadTheme(): Theme {
  if (!isBrowser()) return "system";
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "dark" || v === "light" || v === "system") return v;
  } catch {
    // ignore
  }
  return "system";
}

/** Persist the user's choice. Pass "system" to clear the preference. */
export function saveTheme(theme: Theme): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

/** Resolve a Theme to a concrete dark/light value. */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "dark" || theme === "light") return theme;
  if (
    isBrowser() &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }
  return "dark";
}

/** Apply the theme by toggling the `data-theme="light"` attribute on <html>. */
export function applyTheme(theme: Theme): ResolvedTheme {
  const resolved = resolveTheme(theme);
  if (typeof document === "undefined") return resolved;
  if (resolved === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  return resolved;
}

/**
 * Listen for OS-level preference changes — only meaningful when the
 * user has the theme set to "system". The returned unsubscribe fn
 * stops listening.
 */
export function listenSystemPreference(
  cb: (resolved: ResolvedTheme) => void,
): () => void {
  if (!isBrowser() || typeof window.matchMedia !== "function") return () => {};
  const mql = window.matchMedia("(prefers-color-scheme: light)");
  const handler = (e: MediaQueryListEvent | MediaQueryList) =>
    cb(e.matches ? "light" : "dark");
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }
  // Older Safari fallback. addListener/removeListener exist on the
  // legacy MediaQueryList interface but are typed as deprecated.
  type LegacyMql = {
    addListener?: (cb: (e: MediaQueryListEvent) => void) => void;
    removeListener?: (cb: (e: MediaQueryListEvent) => void) => void;
  };
  const legacy = mql as MediaQueryList & LegacyMql;
  legacy.addListener?.(handler as (e: MediaQueryListEvent) => void);
  return () => {
    legacy.removeListener?.(handler as (e: MediaQueryListEvent) => void);
  };
}

/** Cycle dark → light → system → dark. */
export function cycleTheme(theme: Theme): Theme {
  if (theme === "dark") return "light";
  if (theme === "light") return "system";
  return "dark";
}
