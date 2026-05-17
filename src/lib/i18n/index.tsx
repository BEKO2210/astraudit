/**
 * i18n public API — Roadmap M4.2.
 *
 * Surface:
 *   - <I18nProvider />  →  React Context boundary, lazy‑loads the
 *                          per‑locale catalog the first time it's
 *                          requested. Sits in App.tsx near the root.
 *   - useTranslation()  →  returns `{ t, locale, setLocale }` for
 *                          components.
 *   - getStoredLocale() →  read persisted preference (or default)
 *                          synchronously, suitable for the initial
 *                          provider value before any React mount.
 *
 * Persistence:
 *   - localStorage key `astraudit:locale:v1`
 *   - Falls back to DEFAULT_LOCALE when unset/invalid; we do NOT
 *     sniff `navigator.language` (deliberate — see roadmap
 *     "keine Runtime‑Detection").
 *
 * Lazy loading:
 *   - One dynamic `import()` per locale, so the EN bundle stays
 *     EN‑sized and DE / JA chunks only ship when actually selected.
 *   - First render falls back to the synchronous EN catalog so the
 *     UI doesn't flash empty strings during the initial catalog
 *     fetch.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Catalog, Locale, TranslationKey } from "./types";
import { DEFAULT_LOCALE, LOCALES } from "./types";
import { getLocaleFromPath, pathForLocale } from "./path";
import EN from "./locales/en";

const STORAGE_KEY = "astraudit:locale:v1";

const LOADERS: Record<Locale, () => Promise<{ default: Catalog }>> = {
  en: () => Promise.resolve({ default: EN }),
  de: () => import("./locales/de"),
  ja: () => import("./locales/ja"),
};

function isLocale(value: string | null): value is Locale {
  return value != null && (LOCALES as readonly string[]).includes(value);
}

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    // SecurityError when localStorage is blocked (private mode in
    // some browsers). Fall back gracefully — the i18n layer is
    // never the right thing to crash the app over.
    return DEFAULT_LOCALE;
  }
}

/**
 * Roadmap M4.5 — decide the initial locale on boot.
 *
 * Priority: URL prefix (`/de/`, `/ja/`, `/en/`) > localStorage > default.
 * The URL wins so a shared link like `/astraudit/ja/#/audit/foo/bar`
 * always shows the page in the language the linker intended,
 * regardless of the visitor's stored preference.
 */
export function resolveInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const fromUrl = getLocaleFromPath(window.location.pathname);
  if (fromUrl) return fromUrl;
  return getStoredLocale();
}

function persistLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Same SecurityError tolerance as above.
  }
}

interface I18nValue {
  locale: Locale;
  catalog: Catalog;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  /**
   * Optional initial locale override (for tests / SSR). When
   * omitted, the provider reads from localStorage falling back to
   * the default. We never auto‑detect navigator.language here.
   */
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(
    () => initialLocale ?? resolveInitialLocale(),
  );
  // EN is the canonical safe default. While a non‑EN catalog is
  // loading the UI still renders sensible strings instead of `[empty]`.
  const [catalog, setCatalog] = useState<Catalog>(EN);

  useEffect(() => {
    let cancelled = false;
    LOADERS[locale]()
      .then((mod) => {
        if (cancelled) return;
        setCatalog(mod.default);
      })
      .catch(() => {
        // Network or dynamic‑import failure — fall back to EN so the
        // app stays usable rather than blanking out.
        if (cancelled) return;
        setCatalog(EN);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    persistLocale(next);
    setLocaleState(next);
    if (typeof document !== "undefined") {
      // Keep `<html lang>` in sync so screen readers + browser
      // translate banners see the right value.
      document.documentElement.setAttribute("lang", next);
    }
    // Roadmap M4.5 — keep the URL in sync so the canonical share
    // link for the chosen locale is what the visitor sees in the
    // address bar. We replaceState (not pushState) so the back
    // button still goes to the prior page rather than oscillating
    // between locale URLs. The current hash + search are preserved.
    if (typeof window !== "undefined") {
      const target = pathForLocale(next, window.location.pathname);
      if (target !== window.location.pathname) {
        const newUrl = `${target}${window.location.search}${window.location.hash}`;
        window.history.replaceState(window.history.state, "", newUrl);
      }
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      // The catalog type contract guarantees every key resolves to
      // a string; defensive `?? key` handles a corrupt catalog
      // gracefully (we'd rather show the key than crash).
      return catalog[key] ?? (key as string);
    },
    [catalog],
  );

  const value = useMemo<I18nValue>(
    () => ({ locale, catalog, setLocale, t }),
    [locale, catalog, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Throwing here (rather than returning a no‑op fallback) makes
    // a missing <I18nProvider /> fail loudly in dev rather than
    // silently rendering keys.
    throw new Error("useTranslation must be used inside <I18nProvider />");
  }
  return ctx;
}

export { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE } from "./types";
export type { Locale, Catalog, TranslationKey } from "./types";
