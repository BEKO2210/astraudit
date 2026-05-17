#!/usr/bin/env tsx
/**
 * Roadmap M2.1 (2/3) — captures the seven 1280×720 panel shots that
 * ship with the press kit. 16:9 because every social-media / press
 * surface (Twitter card, OG image, deck slide, magazine spread)
 * crops or expects that aspect.
 *
 * Output: public/press/screenshots/
 *   01-overview.png      — dashboard top + sticky score bar
 *   02-story.png         — Repo Story narrative
 *   03-signals.png       — signal breakdown / category cards
 *   04-findings.png      — filterable findings list
 *   05-graph.png         — interactive audit graph (React Flow)
 *   06-next-steps.png    — prioritised next-steps panel
 *   07-export.png        — Markdown / JSON / AsciiDoc menu open
 *
 * Run:
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
 *     npx tsx scripts/capture-press-shots.ts
 *
 * Or via the wrapper:
 *   npm run press:shots
 *
 * Re-uses the seeded fixture pattern from
 * `scripts/capture-readme-shots.ts` so both image sets stay in sync
 * with the print-validation harness's golden bundle.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "@playwright/test";

import { makeBundle } from "../tests/fixtures/builders";

const PORT = 4326;
const ORIGIN = `http://127.0.0.1:${PORT}/astraudit/`;
const OUT = join(process.cwd(), "public/press/screenshots");
mkdirSync(OUT, { recursive: true });

// Same shape as the print + README fixtures so a curated repo
// renders rich-but-not-noisy. Kept inline to avoid a circular
// import — the README script's `buildFixture()` lives there for the
// same reason.
function buildFixture() {
  return makeBundle({
    metadata: {
      id: 99999,
      fullName: "facebook/react",
      name: "react",
      owner: {
        login: "facebook",
        avatarUrl: "https://example.com/a.png",
        htmlUrl: "https://github.com/facebook",
        type: "Organization",
      },
      description: "The library for web and native user interfaces.",
      stars: 232_109,
      forks: 47_614,
      watchers: 232_109,
      openIssues: 942,
      defaultBranch: "main",
      language: "JavaScript",
      license: { spdxId: "MIT", name: "MIT License" },
      topics: ["javascript", "react", "ui", "frontend", "library"],
      homepage: "https://react.dev",
      htmlUrl: "https://github.com/facebook/react",
      pushedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      createdAt: "2013-05-24T16:15:54Z",
      updatedAt: new Date().toISOString(),
      archived: false,
      disabled: false,
      visibility: "public",
      size: 50_000,
      hasWiki: false,
      hasPages: false,
      hasIssues: true,
      hasProjects: true,
    },
  });
}

async function startPreview(): Promise<ChildProcess> {
  const proc = spawn(
    "npx",
    [
      "vite",
      "preview",
      "--port",
      String(PORT),
      "--strictPort",
      "--host",
      "127.0.0.1",
    ],
    {
      env: { ...process.env, FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  return new Promise((resolve, reject) => {
    let resolved = false;
    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      process.stdout.write(text);
      if (!resolved && /Local:/.test(text)) {
        resolved = true;
        resolve(proc);
      }
    };
    proc.stdout?.on("data", onData);
    proc.stderr?.on("data", (d: Buffer) => process.stderr.write(d));
    proc.on("error", reject);
    setTimeout(() => reject(new Error("preview start timeout")), 15_000);
  });
}

async function seedAndOpen(browser: Browser, theme: "dark" | "light"): Promise<Page> {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  const fixture = buildFixture();
  const seed = JSON.stringify({ bundle: fixture, cachedAt: new Date().toISOString() });
  await page.addInitScript(
    ([s, t]: [string, "dark" | "light"]) => {
      localStorage.setItem("astraudit:bundle:v1:facebook/react", s);
      localStorage.setItem(
        "astraudit:bundle-index:v1",
        JSON.stringify([
          {
            key: "astraudit:bundle:v1:facebook/react",
            cachedAt: new Date().toISOString(),
            sizeApprox: s.length,
            fullName: "facebook/react",
          },
        ]),
      );
      localStorage.setItem("astraudit:theme:v1", t);
    },
    [seed, theme] as [string, "dark" | "light"],
  );
  await page.goto(`${ORIGIN}#/audit/facebook/react`, { waitUntil: "networkidle" });
  await page.waitForSelector('section[id="overview"]', { timeout: 10_000 });
  await page.waitForSelector('section[id="findings"]', { timeout: 5_000 });
  // Aurora glow + any mount animations.
  await page.waitForTimeout(500);
  return page;
}

async function scrollTo(page: Page, sectionId: string): Promise<void> {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (el) {
      // `block: "start"` puts the section's top edge at the viewport
      // top, maximising how much of *that* panel the shot shows.
      el.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
    }
  }, sectionId);
  // Tiny wait for any inline-paint that follows scroll (e.g. lazy
  // graph nodes positioning themselves once visible).
  await page.waitForTimeout(400);
}

async function shoot(page: Page, name: string): Promise<void> {
  const out = join(OUT, `${name}.png`);
  await page.screenshot({ path: out, fullPage: false, omitBackground: false });
  console.log(`  → ${out}`);
}

async function main(): Promise<void> {
  console.log("Starting preview server…");
  const server = await startPreview();
  await new Promise((r) => setTimeout(r, 500));

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });

    // All seven shots use the dark theme — that's the project's
    // canonical surface (per README), and a single-theme set keeps
    // the press kit visually coherent. Light-theme variants live in
    // docs/readme/ already if a reviewer prefers them.
    const PANELS: Array<{
      file: string;
      section: string;
      hint: string;
      prepare?: (page: Page) => Promise<void>;
    }> = [
      {
        file: "01-overview",
        section: "overview",
        hint: "dashboard top + sticky score bar",
      },
      { file: "02-story", section: "story", hint: "Repo Story narrative" },
      { file: "03-signals", section: "signals", hint: "signal cards" },
      { file: "04-findings", section: "findings", hint: "filterable findings list" },
      { file: "05-graph", section: "graph", hint: "interactive audit graph" },
      { file: "06-next-steps", section: "next", hint: "prioritised next steps" },
      {
        file: "07-export",
        section: "overview",
        hint: "Export menu open",
        prepare: async (page) => {
          const trigger = page.getByRole("button", { name: "Export" });
          await trigger.click();
          await page.waitForTimeout(300);
        },
      },
    ];

    for (const panel of PANELS) {
      console.log(`Press shot ${panel.file} (${panel.hint})…`);
      const page = await seedAndOpen(browser, "dark");
      await scrollTo(page, panel.section);
      if (panel.prepare) await panel.prepare(page);
      await shoot(page, panel.file);
      await page.context().close();
    }
  } finally {
    if (browser) await browser.close();
    server.kill();
  }

  console.log("\nAll press shots written to public/press/screenshots/.");
}

main().catch((err) => {
  console.error("Press capture failed:", err);
  process.exit(1);
});
