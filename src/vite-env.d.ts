/// <reference types="vite/client" />

// Vite's `?raw` import attribute returns the file contents as a
// string at build time. Used by Phase 4.5's rule-book page to bundle
// `docs/RULES.md` directly into the JS chunk.
declare module "*.md?raw" {
  const content: string;
  export default content;
}
