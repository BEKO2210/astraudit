/**
 * Generates the screenshot set used in the README.
 *
 * Six shots, all rendered against a seeded rich-fixture audit so the
 * dashboard is fully populated (no empty / loading states). The
 * fixture is the same one used by the print-validation harness so
 * we don't maintain two parallel ones.
 *
 * Output:
 *   docs/readme/desktop-dark.png      1280x800
 *   docs/readme/desktop-light.png     1280x800
 *   docs/readme/mobile-dark.png        390x844 (iPhone 14 Pro)
 *   docs/readme/mobile-light.png       390x844
 *   docs/readme/desktop-graph-dark.png 1280x800 (audit graph in focus)
 *   docs/readme/desktop-export.png     1280x800 (export menu open)
 *
 * Run:
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx tsx scripts/capture-readme-shots.ts
 */

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "@playwright/test";

import { makeBundle } from "../tests/fixtures/builders";

const PORT = 4324;
const ORIGIN = `http://127.0.0.1:${PORT}/astraudit/`;
const OUT = join(process.cwd(), "docs/readme");
mkdirSync(OUT, { recursive: true });

function buildFixture() {
  // Same shape as the print validator. Rich enough that every panel
  // has content; tame enough that screenshots stay legible at scale.
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
      openIssues: 873,
      defaultBranch: "main",
      language: "JavaScript",
      topics: ["javascript", "react", "frontend", "library", "ui"],
      license: { spdxId: "MIT", name: "MIT License" },
      hasPages: true,
      hasIssues: true,
      hasDiscussions: true,
      pushedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 11 * 365 * 24 * 3600 * 1000).toISOString(),
    },
    paths: [
      "README.md",
      "LICENSE",
      "SECURITY.md",
      "CODE_OF_CONDUCT.md",
      "CONTRIBUTING.md",
      "CHANGELOG.md",
      "package.json",
      "tsconfig.json",
      ".eslintrc.json",
      ".prettierrc",
      ".env.example",
      ".gitignore",
      ".github/CODEOWNERS",
      ".github/dependabot.yml",
      ".github/workflows/ci.yml",
      ".github/workflows/codeql.yml",
      "Dockerfile",
      "src/index.tsx",
      "src/App.tsx",
      "tests/App.test.tsx",
      "docs/usage.md",
      "scripts/build.sh",
    ],
    importantFiles: {
      "package.json": JSON.stringify({
        name: "react",
        version: "19.0.0",
        scripts: {
          build: "rollup -c",
          test: "jest",
          lint: "eslint .",
          "test:e2e": "playwright test",
        },
        dependencies: {},
        devDependencies: {
          rollup: "^4.0.0",
          jest: "^29.0.0",
          eslint: "^9.0.0",
        },
      }),
      "SECURITY.md": [
        "# Security Policy",
        "",
        "## Reporting a vulnerability",
        "",
        "Please email security@react.dev — we respond within 48 hours.",
      ].join("\n"),
      "CODE_OF_CONDUCT.md": "# Code of Conduct\n\nWe follow the Contributor Covenant.",
      "CONTRIBUTING.md": "# Contributing\n\nFork, branch, PR.",
      ".github/CODEOWNERS": "* @facebook/react-core",
      ".github/dependabot.yml": "version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: '/'\n    schedule:\n      interval: weekly",
      "CHANGELOG.md": "# Changelog\n\n## 19.0.0 — 2025-12-05\n\n## 18.3.1 — 2024-04-26",
    },
    languages: { JavaScript: 1_400_000, TypeScript: 200_000, HTML: 18_000 },
    readmeContent: "# React\n\n## Installation\n\n```bash\nnpm install react\n```\n\n## Usage\n\nSee https://react.dev.",
    workflows: [
      { name: "CI", path: ".github/workflows/ci.yml", state: "active" },
      { name: "CodeQL", path: ".github/workflows/codeql.yml", state: "active" },
    ],
    recentCommits: Array.from({ length: 30 }, (_, i) => ({
      sha: `c${i.toString().padStart(40, "0")}`,
      message: `Commit ${i + 1}`,
      authorName: i % 4 === 0 ? "Alice" : i % 4 === 1 ? "Bob" : i % 4 === 2 ? "Carol" : "Dave",
      authorDate: new Date(Date.now() - i * 24 * 3600 * 1000).toISOString(),
    })),
    releases: [
      {
        tagName: "v19.0.0",
        name: "19.0.0",
        publishedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        draft: false,
        prerelease: false,
      },
    ],
    issues: { openIssueCount: 873, openPRCount: 254 },
  });
}

async function startPreview(): Promise<{ kill: () => void }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "npx",
      ["vite", "preview", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"],
      { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
    );
    const onData = (d: Buffer) => {
      if (d.toString().includes("http://")) {
        proc.stdout?.removeListener("data", onData);
        resolve({ kill: () => proc.kill("SIGTERM") });
      }
    };
    proc.stdout?.on("data", onData);
    proc.stderr?.on("data", (d: Buffer) => process.stderr.write(d));
    proc.on("error", reject);
    setTimeout(() => reject(new Error("preview start timeout")), 15_000);
  });
}

async function seedAndOpen(
  browser: Browser,
  options: {
    width: number;
    height: number;
    theme: "dark" | "light";
    deviceScaleFactor?: number;
  },
): Promise<Page> {
  const ctx = await browser.newContext({
    viewport: { width: options.width, height: options.height },
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  const fixture = buildFixture();
  const seed = JSON.stringify({ bundle: fixture, cachedAt: new Date().toISOString() });
  await page.addInitScript(
    ([s, theme]: [string, "dark" | "light"]) => {
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
      localStorage.setItem("astraudit:theme:v1", theme);
    },
    [seed, options.theme] as [string, "dark" | "light"],
  );
  await page.goto(`${ORIGIN}#/audit/facebook/react`, {
    waitUntil: "networkidle",
  });
  await page.waitForSelector('section[id="overview"]', { timeout: 10_000 });
  await page.waitForSelector('section[id="findings"]', { timeout: 5_000 });
  // Let any aurora/glow transitions settle.
  await page.waitForTimeout(500);
  return page;
}

async function shoot(page: Page, name: string, opts: { fullPage?: boolean } = {}): Promise<void> {
  const out = join(OUT, `${name}.png`);
  await page.screenshot({
    path: out,
    fullPage: opts.fullPage ?? false,
    omitBackground: false,
  });
  console.log(`  → ${out}`);
}

async function main(): Promise<void> {
  console.log("Starting preview server…");
  const server = await startPreview();
  await new Promise((r) => setTimeout(r, 500));

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });

    /* -------- Desktop ------------------------------------------------ */
    for (const theme of ["dark", "light"] as const) {
      console.log(`Desktop ${theme}…`);
      const page = await seedAndOpen(browser, { width: 1280, height: 800, theme });
      await shoot(page, `desktop-${theme}`);
      await page.context().close();
    }

    /* -------- Mobile (iPhone 14 Pro physical pixels) ----------------- */
    for (const theme of ["dark", "light"] as const) {
      console.log(`Mobile ${theme}…`);
      const page = await seedAndOpen(browser, {
        width: 390,
        height: 844,
        theme,
        deviceScaleFactor: 3,
      });
      await shoot(page, `mobile-${theme}`);
      await page.context().close();
    }

    /* -------- Desktop graph (scroll into the audit graph) ----------- */
    {
      console.log("Desktop graph (dark)…");
      const page = await seedAndOpen(browser, { width: 1280, height: 800, theme: "dark" });
      await page.locator('section[id="graph"]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await shoot(page, "desktop-graph-dark");
      await page.context().close();
    }

    /* -------- Desktop with the Export menu open --------------------- */
    {
      console.log("Desktop export menu (dark)…");
      const page = await seedAndOpen(browser, { width: 1280, height: 800, theme: "dark" });
      // The Export trigger is in the dashboard header. We click it
      // and let the dropdown animate in.
      const trigger = page.getByRole("button", { name: "Export" });
      await trigger.click();
      await page.waitForTimeout(300);
      await shoot(page, "desktop-export");
      await page.context().close();
    }
  } finally {
    if (browser) await browser.close();
    server.kill();
  }

  console.log("\nAll screenshots written to docs/readme/.");
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
