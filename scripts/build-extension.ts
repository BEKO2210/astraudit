/**
 * Roadmap M3.2 — bundle the MV3 extension to dist-extension/.
 *
 * What this does:
 *   1. esbuild bundles extension/src/{service-worker,content-script}.ts
 *      to dist-extension/{service-worker,content-script}.js. Plain
 *      ESM for the SW (matches manifest `"type": "module"`), IIFE
 *      for the content script (safest CSP profile).
 *   2. Copies manifest.json + icons/ verbatim.
 *   3. Generates placeholder icon PNGs at 16/48/128 if the maintainer
 *      hasn't replaced them yet (so a fresh clone can `npm run
 *      build:ext` and load the unpacked extension without missing-
 *      asset errors in Chrome's `chrome://extensions` page).
 *   4. Zips the output to dist-extension/astraudit-extension.zip for
 *      easy "load unpacked" / store upload.
 *
 * Cross-browser packaging (Firefox `web-ext` + Safari converter)
 * lands in M3.4.
 */

import { build } from "esbuild";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const SRC = resolve(ROOT, "extension");
const OUT = resolve(ROOT, "dist-extension");

// A tiny 1×1 transparent PNG used as a placeholder when the real
// icon files don't exist yet. Base64-decoded into the right slot;
// Chrome accepts it without complaint, and the placeholder makes
// the missing-asset story obvious to anyone inspecting the build.
const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

async function bundleEsm(entry: string, outfile: string): Promise<void> {
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "browser",
    target: ["es2022"],
    format: "esm",
    outfile,
    sourcemap: true,
    minify: false,
    resolveExtensions: [".ts", ".js"],
    legalComments: "inline",
  });
}

async function bundleIife(entry: string, outfile: string): Promise<void> {
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "browser",
    target: ["es2022"],
    format: "iife",
    outfile,
    sourcemap: true,
    minify: false,
    resolveExtensions: [".ts", ".js"],
    legalComments: "inline",
  });
}

function copyManifest(): void {
  cpSync(resolve(SRC, "manifest.json"), resolve(OUT, "manifest.json"));
}

function copyOrPlaceholderIcons(): void {
  const iconsDir = resolve(OUT, "icons");
  mkdirSync(iconsDir, { recursive: true });
  const sizes = [16, 48, 128];
  const placeholder = Buffer.from(TRANSPARENT_PNG_BASE64, "base64");
  for (const size of sizes) {
    const srcIcon = resolve(SRC, "icons", `icon-${size}.png`);
    const outIcon = resolve(iconsDir, `icon-${size}.png`);
    if (existsSync(srcIcon)) {
      cpSync(srcIcon, outIcon);
    } else {
      writeFileSync(outIcon, placeholder);
      console.warn(
        `  ! extension/icons/icon-${size}.png missing — wrote 1×1 placeholder.`,
      );
    }
  }
}

function zipForStore(): void {
  const zipPath = resolve(OUT, "astraudit-extension.zip");
  if (existsSync(zipPath)) rmSync(zipPath);
  // `cd` into OUT then zip to avoid the parent directory ending up
  // inside the archive — Chrome / Edge stores reject zips where
  // manifest.json isn't at the root.
  execSync(
    `cd "${OUT}" && zip -qr astraudit-extension.zip . -x astraudit-extension.zip`,
    { stdio: "inherit" },
  );
}

function readManifestVersion(): string {
  const raw = readFileSync(resolve(SRC, "manifest.json"), "utf8");
  const parsed = JSON.parse(raw) as { version: string };
  return parsed.version;
}

async function main(): Promise<void> {
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  await bundleEsm(
    resolve(SRC, "src/service-worker.ts"),
    resolve(OUT, "service-worker.js"),
  );
  await bundleIife(
    resolve(SRC, "src/content-script.ts"),
    resolve(OUT, "content-script.js"),
  );

  copyManifest();
  copyOrPlaceholderIcons();
  zipForStore();

  const version = readManifestVersion();
  const swSize = statSync(resolve(OUT, "service-worker.js")).size;
  const csSize = statSync(resolve(OUT, "content-script.js")).size;
  const zipSize = statSync(resolve(OUT, "astraudit-extension.zip")).size;

  console.log("\nExtension built:");
  console.log(`  manifest version       ${version}`);
  console.log(`  service-worker.js      ${(swSize / 1024).toFixed(1)} KB`);
  console.log(`  content-script.js      ${(csSize / 1024).toFixed(1)} KB`);
  console.log(`  astraudit-extension.zip ${(zipSize / 1024).toFixed(1)} KB`);
  console.log(`\nLoad unpacked: chrome://extensions → "Load unpacked" → select ${OUT}`);
}

main().catch((err) => {
  console.error("build-extension failed:", err);
  process.exit(1);
});
