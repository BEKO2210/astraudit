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
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/astraudit/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
