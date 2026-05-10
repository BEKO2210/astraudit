/**
 * Phase 5.10 — minimal `useMediaQuery` hook.
 *
 * We hand-roll instead of pulling in a dependency for the same reason
 * the rest of `lib/ui` is hand-rolled: keep the bundle tight and the
 * behaviour explicit.
 *
 * Why not just read `window.innerWidth` once on mount?
 *   - Orientation change on mobile + resizing on a desktop dev tools
 *     emulator both flip the value, and React Flow's
 *     `panOnDrag={false}` (the reason we need this hook) has to be
 *     re-applied so the user doesn't get stuck with the wrong gesture
 *     handling after rotating their phone.
 *
 * SSR safety: returns `false` until hydration completes, then upgrades
 * via the `useEffect`. Components that need the SSR default to be
 * `true` should pass `defaultValue: true`.
 */

import { useEffect, useState } from "react";

export function useMediaQuery(
  query: string,
  defaultValue: boolean = false,
): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return defaultValue;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    // `addEventListener("change", …)` is the modern API; older Safari
    // (≤ 13) still requires the deprecated `addListener`. We support
    // both because Astraudit is a no-backend public tool and someone
    // on an old iPad will eventually try it.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }
    mql.addListener(update);
    return () => mql.removeListener(update);
  }, [query]);

  return matches;
}

/**
 * Convenience: are we below the Tailwind `md` breakpoint (768 px)?
 * Used by the audit graph to disable React Flow's gesture handlers
 * that would otherwise hijack the page scroll on mobile.
 */
export function useIsNarrowViewport(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
