/**
 * Phase 5.10 — useMediaQuery + useIsNarrowViewport.
 *
 * The Astraudit test bench renders via renderToStaticMarkup (no
 * jsdom, no @testing-library). That's enough to lock the contracts
 * we actually care about for the mobile-graph fix:
 *
 *  1. The hook reads matchMedia on first render — verified by
 *     stubbing window.matchMedia and rendering a probe component
 *     that emits the value into the markup.
 *  2. `useIsNarrowViewport` queries `(max-width: 767px)` — verified
 *     by capturing the query string passed to the matchMedia stub.
 *  3. The hook is SSR-safe: returns the supplied default when
 *     matchMedia is unavailable.
 *
 * The "media-query change updates the hook" path is not testable
 * here (useEffect doesn't fire in static render), but it's
 * straightforward subscription code and is covered by the
 * Playwright spec at tests/visual/auditGraphMobile.spec.ts which
 * exercises the live viewport-resize behaviour end-to-end.
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  useMediaQuery,
  useIsNarrowViewport,
} from "../../../src/lib/ui/useMediaQuery";

interface FakeMql {
  matches: boolean;
  media: string;
  onchange: ((e: MediaQueryListEvent) => void) | null;
  addEventListener: () => void;
  removeEventListener: () => void;
}

const realMatchMedia = (globalThis as { matchMedia?: unknown }).matchMedia;

function withFakeMatchMedia<T>(
  initial: Record<string, boolean>,
  fn: (capture: { lastQuery: string }) => T,
): T {
  const capture = { lastQuery: "" };
  const stub = (query: string): FakeMql => {
    capture.lastQuery = query;
    return {
      matches: initial[query] ?? false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  };
  // jsdom is absent so `window` doesn't exist; the hook reads
  // `window.matchMedia`, so we put it on globalThis under both names.
  (globalThis as unknown as { window: { matchMedia: typeof stub } }).window =
    { matchMedia: stub };
  (globalThis as unknown as { matchMedia: typeof stub }).matchMedia = stub;
  try {
    return fn(capture);
  } finally {
    if (realMatchMedia === undefined) {
      delete (globalThis as { matchMedia?: unknown }).matchMedia;
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { matchMedia?: unknown }).matchMedia = realMatchMedia;
    }
  }
}

function MediaQueryProbe({
  query,
  defaultValue,
}: {
  query: string;
  defaultValue?: boolean;
}) {
  const matches = useMediaQuery(query, defaultValue);
  return <span data-testid="probe">{matches ? "yes" : "no"}</span>;
}

function NarrowProbe() {
  const isNarrow = useIsNarrowViewport();
  return <span data-testid="probe">{isNarrow ? "narrow" : "wide"}</span>;
}

describe("useMediaQuery — SSR / first-render contract", () => {
  beforeEach(() => {
    // No-op — withFakeMatchMedia handles per-test stubbing.
  });
  afterEach(() => {
    // Belt-and-suspenders cleanup in case a test threw.
    if (realMatchMedia === undefined) {
      delete (globalThis as { matchMedia?: unknown }).matchMedia;
      delete (globalThis as { window?: unknown }).window;
    }
  });

  it("returns true on first render when the query matches", () => {
    const html = withFakeMatchMedia({ "(max-width: 767px)": true }, () =>
      renderToStaticMarkup(<MediaQueryProbe query="(max-width: 767px)" />),
    );
    expect(html).toContain(">yes<");
  });

  it("returns false on first render when the query does NOT match", () => {
    const html = withFakeMatchMedia({ "(max-width: 767px)": false }, () =>
      renderToStaticMarkup(<MediaQueryProbe query="(max-width: 767px)" />),
    );
    expect(html).toContain(">no<");
  });

  it("returns the supplied default when matchMedia is unavailable (SSR / very old browsers)", () => {
    // Make sure neither window nor a global matchMedia is defined.
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { matchMedia?: unknown }).matchMedia;
    const html = renderToStaticMarkup(
      <MediaQueryProbe query="(max-width: 767px)" defaultValue={true} />,
    );
    expect(html).toContain(">yes<");
  });
});

describe("useIsNarrowViewport — Tailwind breakpoint anchor", () => {
  it("queries `(max-width: 767px)` exactly", () => {
    const last = withFakeMatchMedia({}, (capture) => {
      renderToStaticMarkup(<NarrowProbe />);
      return capture.lastQuery;
    });
    expect(last).toBe("(max-width: 767px)");
  });

  it("returns 'narrow' when the viewport is below the breakpoint", () => {
    const html = withFakeMatchMedia({ "(max-width: 767px)": true }, () =>
      renderToStaticMarkup(<NarrowProbe />),
    );
    expect(html).toContain(">narrow<");
  });

  it("returns 'wide' when the viewport is at or above the breakpoint", () => {
    const html = withFakeMatchMedia({ "(max-width: 767px)": false }, () =>
      renderToStaticMarkup(<NarrowProbe />),
    );
    expect(html).toContain(">wide<");
  });
});
