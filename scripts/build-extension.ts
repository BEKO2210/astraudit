/**
 * Roadmap M3.2 + M3.4 — bundle the MV3 extension for every browser
 * that ships an MV3 runtime.
 *
 * Layout produced (dist-extension/):
 *   chrome/         ← load-unpacked or upload to Chrome Web Store
 *     manifest.json
 *     service-worker.js   (+ .map)
 *     content-script.js   (+ .map)
 *     icons/{16,48,128}.png
 *   chrome.zip      ← Chrome Web Store / Edge Add-ons upload
 *
 *   firefox/        ← load-temporary or upload to AMO
 *     manifest.json   (+ browser_specific_settings.gecko)
 *     …same bundles + icons…
 *   firefox.zip
 *
 *   safari-source/  ← input for xcrun safari-web-extension-converter
 *                     (M3.5 maintainer runs the converter on macOS)
 *     …chrome-shaped layout — Safari converter prefers it…
 *
 * Bundles + icons are byte-identical across browsers; only the
 * manifest differs. The output dir is gitignored — regenerated via
 * `npm run build:ext`.
 *
 * Why one script instead of three:
 *   The detector + UI code is browser-agnostic. The only thing that
 *   actually differs is `manifest.json`, and a single fan-out
 *   keeps the per-browser drift visible in a single diff.
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
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const SRC = resolve(ROOT, "extension");
const OUT = resolve(ROOT, "dist-extension");

const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/**
 * Firefox-specific extension identity. Required by AMO for any
 * persistent install. Bumping the strict_min_version moves the
 * extension's compatibility floor — keep it pinned to the lowest
 * Firefox we've verified the SW model works on.
 */
const GECKO_ID = "astraudit@beko2210.github.io";
const GECKO_MIN_VERSION = "128.0";

interface BaseManifest {
  manifest_version: number;
  name: string;
  version: string;
  // The rest is opaque to this script — we only mutate the bits
  // each browser needs and leave everything else untouched.
  [key: string]: unknown;
}

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

function loadManifest(): BaseManifest {
  return JSON.parse(
    readFileSync(resolve(SRC, "manifest.json"), "utf8"),
  ) as BaseManifest;
}

function writeManifest(targetDir: string, manifest: BaseManifest): void {
  writeFileSync(
    resolve(targetDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
}

function copyOrPlaceholderIcons(targetDir: string): {
  warnings: string[];
} {
  const iconsDir = resolve(targetDir, "icons");
  mkdirSync(iconsDir, { recursive: true });
  const sizes = [16, 48, 128];
  const placeholder = Buffer.from(TRANSPARENT_PNG_BASE64, "base64");
  const warnings: string[] = [];
  for (const size of sizes) {
    const srcIcon = resolve(SRC, "icons", `icon-${size}.png`);
    const outIcon = resolve(iconsDir, `icon-${size}.png`);
    if (existsSync(srcIcon)) {
      cpSync(srcIcon, outIcon);
    } else {
      writeFileSync(outIcon, placeholder);
      warnings.push(`icon-${size}.png missing — wrote 1×1 placeholder`);
    }
  }
  return { warnings };
}

function zip(dir: string, zipName: string): number {
  const zipPath = resolve(OUT, zipName);
  if (existsSync(zipPath)) rmSync(zipPath);
  // Always zip the contents of `dir` (so manifest.json lands at the
  // archive root — every store rejects nested layouts).
  execSync(
    `cd "${dir}" && zip -qr "${zipPath}" . -x "${zipName}"`,
    { stdio: "inherit" },
  );
  return statSync(zipPath).size;
}

async function buildSharedAssets(targetDir: string): Promise<void> {
  mkdirSync(targetDir, { recursive: true });
  await bundleEsm(
    resolve(SRC, "src/service-worker.ts"),
    resolve(targetDir, "service-worker.js"),
  );
  await bundleIife(
    resolve(SRC, "src/content-script.ts"),
    resolve(targetDir, "content-script.js"),
  );
}

function makeChromeManifest(base: BaseManifest): BaseManifest {
  // Chrome's MV3 manifest matches the source verbatim. Stripping
  // anything Firefox-specific keeps the Chrome store reviewer
  // from raising warnings about unknown keys.
  const copy = JSON.parse(JSON.stringify(base)) as BaseManifest;
  delete copy.browser_specific_settings;
  return copy;
}

function makeFirefoxManifest(base: BaseManifest): BaseManifest {
  const copy = JSON.parse(JSON.stringify(base)) as BaseManifest;
  // AMO requires a stable extension ID for any non-temporary
  // install. Firefox 121+ supports the `service_worker` background
  // field; older Firefoxes don't, so pin the min version.
  copy.browser_specific_settings = {
    gecko: {
      id: GECKO_ID,
      strict_min_version: GECKO_MIN_VERSION,
    },
  };
  return copy;
}

function makeSafariManifest(base: BaseManifest): BaseManifest {
  // Safari's converter ingests a Chrome-shaped extension directory
  // (manifest, scripts, icons) and produces an Xcode project. The
  // converter rewrites permissions + SW for Safari itself, so we
  // hand it the Chrome-flavoured manifest unchanged.
  return makeChromeManifest(base);
}

async function buildTarget(
  label: string,
  manifest: BaseManifest,
  subdir: string,
  zipName: string | null,
): Promise<void> {
  const dir = resolve(OUT, subdir);
  await buildSharedAssets(dir);
  writeManifest(dir, manifest);
  const { warnings } = copyOrPlaceholderIcons(dir);

  let zipBytes = 0;
  if (zipName) zipBytes = zip(dir, zipName);

  const swSize = statSync(resolve(dir, "service-worker.js")).size;
  const csSize = statSync(resolve(dir, "content-script.js")).size;

  console.log(`\n${label}:`);
  console.log(`  ${subdir}/manifest.json     v${manifest.version}`);
  console.log(`  ${subdir}/service-worker.js ${(swSize / 1024).toFixed(1)} KB`);
  console.log(`  ${subdir}/content-script.js ${(csSize / 1024).toFixed(1)} KB`);
  if (zipName) {
    console.log(`  ${zipName}              ${(zipBytes / 1024).toFixed(1)} KB`);
  }
  for (const w of warnings) console.log(`  ! ${w}`);
}

async function main(): Promise<void> {
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const base = loadManifest();

  await buildTarget(
    "Chrome / Edge / Brave / Arc",
    makeChromeManifest(base),
    "chrome",
    "chrome.zip",
  );
  await buildTarget(
    "Firefox (AMO)",
    makeFirefoxManifest(base),
    "firefox",
    "firefox.zip",
  );
  await buildTarget(
    "Safari source (input for xcrun safari-web-extension-converter)",
    makeSafariManifest(base),
    "safari-source",
    // Safari doesn't take a zip — the converter ingests the dir
    // and emits an Xcode project. Skip zipping.
    null,
  );

  console.log("\nNext steps:");
  console.log(`  Chrome:  chrome://extensions → "Load unpacked" → ${join(OUT, "chrome")}`);
  console.log(`  Firefox: about:debugging#/runtime/this-firefox → "Load Temporary Add-on" → ${join(OUT, "firefox", "manifest.json")}`);
  console.log(`  Safari:  (on macOS) xcrun safari-web-extension-converter ${join(OUT, "safari-source")} --bundle-identifier io.github.beko2210.astraudit`);
}

main().catch((err) => {
  console.error("build-extension failed:", err);
  process.exit(1);
});
