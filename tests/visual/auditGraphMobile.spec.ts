/**
 * Phase 5.10 — audit-graph mobile gesture-trap regression guard.
 *
 * The maintainer reported "auf Mobile Geräte … wackelte und ruckelt
 * alles wenn es in den Bereich kommt" — when the page scrolled into
 * the audit-graph section on mobile, the page started wobbling and
 * stuttering. Root cause: React Flow's default touch handlers
 * (`panOnDrag: true`, `zoomOnScroll: true`, `preventScrolling: true`)
 * captured the single-finger touch stream and fought the page scroll.
 *
 * The fix (Phase 5.10) disables those handlers below the md
 * breakpoint and adds `touch-action: pan-y` on the wrapper so the
 * browser routes vertical gestures to the page.
 *
 * This spec locks the contract:
 *   1. The graph wrapper has `touch-action: pan-y` on a 360-px
 *      viewport (and not on a 1280-px one).
 *   2. A simulated wheel/swipe past the graph actually scrolls the
 *      page — `window.scrollY` advances. The graph does NOT trap
 *      the gesture.
 *   3. `<Controls>` still renders so users have an explicit pan/zoom
 *      affordance even with the touch handlers disabled.
 *
 * To make 2 deterministic without a live audit, we seed a bundle
 * into localStorage exactly the way the print-validation harness
 * does (Phase 5.7). This sidesteps GitHub rate limits + flake.
 */

import { expect, test } from "@playwright/test";
import { makeBundle } from "../fixtures/builders";

const FIXTURE_BUNDLE = makeBundle({
  metadata: {
    fullName: "demo-org/mobile-fixture",
    name: "mobile-fixture",
    owner: {
      login: "demo-org",
      avatarUrl: "https://example.com/a.png",
      htmlUrl: "https://example.com/demo-org",
      type: "Organization",
    },
    description: "Mobile-graph regression fixture.",
    stars: 100,
    defaultBranch: "main",
    language: "TypeScript",
    topics: ["typescript"],
    license: { spdxId: "MIT", name: "MIT" },
  },
  paths: ["README.md", "LICENSE", "package.json", "src/index.ts"],
  importantFiles: {
    "package.json": JSON.stringify({
      name: "mobile-fixture",
      scripts: { build: "vite build", test: "vitest run" },
      dependencies: { react: "^18.0.0" },
    }),
  },
  readmeContent: "# Mobile fixture\n\n## Installation\nnpm install",
});

const SEED = JSON.stringify({
  bundle: FIXTURE_BUNDLE,
  cachedAt: new Date().toISOString(),
});

const HASH = "/#/audit/demo-org/mobile-fixture";

async function seedAndLoad(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript((seed: string) => {
    localStorage.setItem(
      "astraudit:bundle:v1:demo-org/mobile-fixture",
      seed,
    );
    localStorage.setItem(
      "astraudit:bundle-index:v1",
      JSON.stringify([
        {
          key: "astraudit:bundle:v1:demo-org/mobile-fixture",
          cachedAt: new Date().toISOString(),
          sizeApprox: seed.length,
          fullName: "demo-org/mobile-fixture",
        },
      ]),
    );
  }, SEED);
  await page.goto(HASH, { waitUntil: "networkidle" });
  await page.waitForSelector('section[id="overview"]', { timeout: 15_000 });
  await page.waitForSelector('section[id="graph"]', { timeout: 5_000 });
}

test.describe("Phase 5.10 — audit graph mobile gesture handling", () => {
  test.use({ viewport: { width: 360, height: 720 } });

  test("graph wrapper has touch-action: pan-y on narrow viewport", async ({
    page,
  }) => {
    await seedAndLoad(page);
    // Find the wrapper that hosts <ReactFlow>. We anchor on the
    // class signature from AuditGraph.tsx; the React Flow root has
    // `.react-flow` as its outer class.
    const wrapper = page.locator('.react-flow').locator('xpath=..');
    const touchAction = await wrapper.evaluate(
      (el) => getComputedStyle(el as HTMLElement).touchAction,
    );
    expect(touchAction).toContain("pan-y");
  });

  test("scrolling past the graph advances window.scrollY (no gesture trap)", async ({
    page,
  }) => {
    await seedAndLoad(page);
    // Anchor: scroll the graph section into view first.
    await page.locator('section[id="graph"]').scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);

    // Synthesise a wheel scroll over the graph. With Phase 5.10's
    // `preventScrolling={false}` on mobile, the wheel event must
    // bubble up and scroll the page.
    const graphBox = await page.locator('.react-flow').boundingBox();
    if (!graphBox) throw new Error("Graph not laid out");
    await page.mouse.move(
      graphBox.x + graphBox.width / 2,
      graphBox.y + graphBox.height / 2,
    );
    await page.mouse.wheel(0, 500);
    // Give the browser a frame to commit the scroll.
    await page.waitForTimeout(120);

    const after = await page.evaluate(() => window.scrollY);
    expect(
      after,
      `Page should have scrolled past the graph, but scrollY went from ${before} to ${after}`,
    ).toBeGreaterThan(before);
  });

  test("Controls (zoom in/out/fit) still render on mobile", async ({
    page,
  }) => {
    await seedAndLoad(page);
    // React Flow's `<Controls>` adds `.react-flow__controls` with
    // its three default buttons. Users without touch pan/zoom rely
    // on these explicit affordances.
    await expect(page.locator(".react-flow__controls")).toBeVisible();
    const buttons = await page
      .locator(".react-flow__controls button")
      .count();
    expect(buttons).toBeGreaterThanOrEqual(2);
  });
});

test.describe("Phase 5.10 — desktop graph still pans/zooms", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("graph wrapper does NOT force touch-action on wide viewport", async ({
    page,
  }) => {
    await seedAndLoad(page);
    const wrapper = page.locator('.react-flow').locator('xpath=..');
    const touchAction = await wrapper.evaluate(
      (el) => getComputedStyle(el as HTMLElement).touchAction,
    );
    // The desktop branch leaves touch-action default ("auto"); the
    // narrow-viewport branch sets "pan-y". Either way it should NOT
    // be "pan-y" on desktop.
    expect(touchAction).not.toContain("pan-y");
  });
});
