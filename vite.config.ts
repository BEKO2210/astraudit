import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/astraudit/",
  plugins: [react()],
  build: {
    target: "es2020",
    sourcemap: false,
    // Phase 6.15 — keep the local "chunks > 500 kB" warning live so a
    // drift back over the ceiling is visible the moment a contributor
    // builds. The hard CI gate lives in scripts/check-bundle-size.ts.
    chunkSizeWarningLimit: 500,
  },
  worker: {
    format: "es",
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/github/**"],
    },
  },
});
