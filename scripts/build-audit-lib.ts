/**
 * Roadmap M3.1 — bundle the audit engine as a tree-shakeable ESM
 * library so the upcoming browser extension (M3.2+) and the
 * bookmarklet (M3.6) can `import { runAudit, loadRepoBundle } from
 * "astraudit/audit-engine"` instead of reaching into `src/`.
 *
 * Output:
 *   dist-audit-lib/audit-engine.js   — bundled ESM, no runtime deps
 *   dist-audit-lib/audit-engine.d.ts — flattened type surface
 *
 * Design:
 *   - Single-file ESM bundle so a consumer's bundler (vite, esbuild,
 *     rollup, webpack) can tree-shake against it. The audit pipeline
 *     is pure (no DOM, no Node-specific I/O beyond `fetch`), so the
 *     bundle runs unchanged in a browser, a service worker, or
 *     Node 20+.
 *   - `zod` is the only runtime dep we mark external — the consumer
 *     installs it. Everything else from src/lib/audit/, src/lib/github/
 *     and src/types/ inlines so the consumer sees one self-contained
 *     module.
 *   - Source map shipped so extension dev tools can step through
 *     detector logic.
 *   - The `.d.ts` is hand-rolled (a re-export of src/audit-engine.ts'
 *     declaration file produced by `tsc --emitDeclarationOnly`) so
 *     TypeScript consumers see the same surface our entry barrel
 *     declares.
 */

import { build } from "esbuild";
import {
  mkdirSync,
  statSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const OUT_DIR = resolve(ROOT, "dist-audit-lib");
const ENTRY = resolve(ROOT, "src/audit-engine.ts");

async function bundleJs(): Promise<void> {
  await build({
    entryPoints: [ENTRY],
    bundle: true,
    platform: "neutral", // browser + Node + service-worker friendly
    target: ["es2022"],
    format: "esm",
    outfile: resolve(OUT_DIR, "audit-engine.js"),
    sourcemap: true,
    minify: false, // consumer's bundler will minify in their build
    external: ["zod"], // runtime dep, consumer installs
    resolveExtensions: [".ts", ".tsx", ".js", ".mjs"],
    legalComments: "inline",
  });
}

function emitTypes(): void {
  // We use a one-off tsconfig that points at the library entry and
  // tells tsc to emit declarations only. This keeps the main build
  // (`tsc -b --noEmit` via `npm run typecheck`) untouched.
  const tmpTsconfig = resolve(ROOT, "tsconfig.audit-lib.json");
  const cfg = {
    extends: "./tsconfig.app.json",
    compilerOptions: {
      declaration: true,
      emitDeclarationOnly: true,
      outDir: "dist-audit-lib",
      noEmit: false,
      composite: false,
      incremental: false,
      rootDir: "src",
    },
    include: ["src/audit-engine.ts", "src/lib/**/*", "src/types/**/*"],
    exclude: ["node_modules", "tests", "dist", "dist-bin", "dist-audit-lib"],
  };
  writeFileSync(tmpTsconfig, JSON.stringify(cfg, null, 2));
  try {
    const res = spawnSync(
      "npx",
      ["tsc", "-p", tmpTsconfig],
      { stdio: "inherit" },
    );
    if (res.status !== 0) {
      throw new Error(`tsc declaration emit exited with ${res.status}`);
    }
  } finally {
    rmSync(tmpTsconfig, { force: true });
  }
}

async function main(): Promise<void> {
  if (existsSync(OUT_DIR)) {
    rmSync(OUT_DIR, { recursive: true, force: true });
  }
  mkdirSync(OUT_DIR, { recursive: true });

  await bundleJs();
  emitTypes();

  const js = statSync(resolve(OUT_DIR, "audit-engine.js"));
  const dts = existsSync(resolve(OUT_DIR, "audit-engine.d.ts"))
    ? statSync(resolve(OUT_DIR, "audit-engine.d.ts"))
    : null;

  console.log(
    `src/audit-engine.ts → dist-audit-lib/audit-engine.js (${(js.size / 1024).toFixed(1)} KB)`,
  );
  if (dts) {
    console.log(
      `                    + dist-audit-lib/audit-engine.d.ts (${(dts.size / 1024).toFixed(1)} KB)`,
    );
  } else {
    console.log("                    (no .d.ts emitted — investigate)");
  }
}

main().catch((err) => {
  console.error("build-audit-lib failed:", err);
  process.exit(1);
});
