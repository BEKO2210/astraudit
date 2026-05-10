/**
 * Compile `bin/*.ts` to `dist-bin/*.js` so the published npm
 * package exposes a runnable JavaScript entry point (consumers
 * may not have a TypeScript toolchain — `npx astraudit-mcp`
 * should Just Work).
 *
 * We use esbuild because:
 *   1. The output is a single bundled file per entry, so
 *      `dist-bin/mcp-server.js` can be invoked directly without
 *      Vite-style module-resolution magic.
 *   2. It honours TS path aliases + .ts extensions natively.
 *   3. It's already a transitive dep (Vite pulls it in).
 *
 * The bundle keeps `@modelcontextprotocol/sdk` external (it's a
 * runtime dep in package.json, consumers install it). Everything
 * else from `src/lib/audit/`, `src/lib/github/`, `src/lib/export/`
 * + `src/types/` gets inlined so we don't have to ship the entire
 * `src/` tree in the published tarball.
 */

import { build } from "esbuild";
import { mkdirSync, statSync, chmodSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT_DIR = resolve(process.cwd(), "dist-bin");

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  const entryPoints = [resolve(process.cwd(), "bin/mcp-server.ts")];

  await build({
    entryPoints,
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    outdir: OUT_DIR,
    outExtension: { ".js": ".js" },
    sourcemap: false,
    minify: false,
    // The MCP SDK + zod are runtime deps in package.json; the
    // consumer installs them via npm. Bundling them would double
    // the install size and break peer-dep resolution.
    external: ["@modelcontextprotocol/sdk", "@modelcontextprotocol/sdk/*", "zod"],
    // bin/mcp-server.ts already carries its own `#!/usr/bin/env node`
    // shebang as line 1; esbuild preserves it through the bundle.
    // We deliberately do NOT also set a banner, otherwise the
    // shebang ends up duplicated and Node's parser chokes on the
    // second one (the first looks like a comment, the second looks
    // like an invalid private-class identifier).
    resolveExtensions: [".ts", ".tsx", ".js", ".mjs"],
  });

  const outFile = resolve(OUT_DIR, "mcp-server.js");
  const stats = statSync(outFile);
  chmodSync(outFile, 0o755);

  // Belt-and-suspenders: ensure the shebang is the very first line
  // even if esbuild's banner placement changes in a future release.
  const content = readFileSync(outFile, "utf8");
  if (!content.startsWith("#!/usr/bin/env node")) {
    writeFileSync(outFile, `#!/usr/bin/env node\n${content}`);
  }

  console.log(
    `bin/mcp-server.ts → dist-bin/mcp-server.js (${(stats.size / 1024).toFixed(1)} KB)`,
  );
}

main().catch((err) => {
  console.error("build-bin failed:", err);
  process.exit(1);
});
