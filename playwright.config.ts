/**
 * Playwright config — Phase 4.1 visual regression tests.
 *
 * Strategy:
 *   - Run against the production preview build (`npm run preview`)
 *     so the screenshots reflect what GitHub Pages actually serves.
 *   - Single project (Chromium on the bundled Playwright binary).
 *     Visual snapshots are notoriously flaky across browsers and OS
 *     font rendering, so we standardise on the CI image's environment
 *     and only commit baselines generated there.
 *   - Animations and motion-safe transitions are disabled at the
 *     `expect` level so a half-rendered fade can't fail a snapshot.
 *   - `prefers-reduced-motion: reduce` is forced via the context's
 *     `reducedMotion: 'reduce'` option, which doubles as a real-world
 *     accessibility-mode probe.
 *   - Volatile UI elements (the year in the footer, the "published N
 *     days ago" timestamps) are masked per-spec via Playwright's
 *     `toHaveScreenshot({ mask: [...] })` API — see specs in
 *     `tests/visual/`.
 *   - We bind to the Vite preview server (default port 4173) and
 *     reuse it across specs to avoid the ~3 s startup cost.
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/visual",
  /* Snapshots live next to the spec that creates them so a regression
   * is obvious in the diff. */
  snapshotPathTemplate:
    "{testDir}/__snapshots__/{testFilePath}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: "http://127.0.0.1:4173/astraudit/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    /* Force reduced motion so animations are never mid-flight. */
    reducedMotion: "reduce",
    /* Lock viewport so screenshots don't depend on the runner's
     * default. 1280×800 is a common laptop landscape and matches
     * Playwright's default if we ever drop the override. */
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark",
    locale: "en-US",
    timezoneId: "Europe/Berlin",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  expect: {
    /* Allow up to 0.5 % of pixels to differ — covers anti-aliasing
     * and font-hinting jitter without inviting silent regressions. */
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.005,
      animations: "disabled",
      caret: "hide",
    },
  },
  /* webServer notes — Phase 5.x bugfix.

     The CI a11y + visual specs were timing out because we used to run
     `npm run build && npm run preview` here, packing a 60-90 s
     TypeScript + Vite build into the 120 s probe window. With
     `stdout: "ignore"` we couldn't even tell which half was stuck
     ("[WebServer] Some chunks are larger than 500 kB" was the entire
     diagnostic).

     Fix: build is its own GitHub Actions step now (see
     `.github/workflows/visual.yml` and `quality.yml`), so this
     command only spins up the preview server — which binds in <2 s.
     Locally the preview-only command also matches the dev workflow
     and stays interactive. `stdout: "pipe"` so the next time we hit
     a timeout we can actually see the Vite output. */
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:4173/astraudit/",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
