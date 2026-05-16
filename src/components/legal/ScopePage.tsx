/**
 * <ScopePage /> — Phase 7.0.8.
 *
 * Renders `docs/SCOPE.md` as the in-app scope page at `#/scope`.
 * The markdown is imported as a raw string at build time (Vite
 * `?raw`) so there's no extra fetch + the content is bundled into
 * its own lazy chunk (App.tsx lazy-loads this component).
 *
 * Why a real markdown render rather than ReactNode children?
 *   1. The same file (`docs/SCOPE.md`) is the canonical
 *      documentation on GitHub. Maintaining one source means there's
 *      no drift between the in-app view and the rendered repo doc.
 *   2. Future scope-policy edits land via plain Markdown — no JSX
 *      edits, no build-step regeneration.
 *
 * Pattern mirrors <RuleBook /> exactly (Phase 4.5).
 */

import MarkdownIt from "markdown-it";
import { useMemo } from "react";
// `?raw` yields the file contents as a string at build time. The
// markdown lives in `docs/` so a contributor editing the scope
// policy never has to know that the in-app page exists.
import SCOPE_MD from "../../../docs/SCOPE.md?raw";
import { DocPage } from "./DocPage";

/** Single shared markdown-it instance — instantiating it once per
 *  render would re-compile every plugin chain. `html: false` keeps
 *  the same XSS-defensive baseline as the README preview + rule
 *  book. */
const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

/**
 * Drop the markdown's leading `# What Astraudit checks...` heading
 * so the in-app render has exactly one <h1> — the DocPage title
 * above the markdown body. Two <h1>s would break the
 * WCAG-required heading hierarchy and confuse screen readers about
 * what page they landed on. The GitHub view still gets the
 * heading because GitHub shows the file's first H1 as the page
 * banner regardless.
 */
function stripLeadingH1(source: string): string {
  return source.replace(/^\s*#[^\n]*\n+/, "");
}

export function ScopePage() {
  const html = useMemo(() => md.render(stripLeadingH1(SCOPE_MD)), []);
  return (
    <DocPage
      title="What Astraudit checks (and what it doesn't)"
      backLabel="Back to app"
      nav={[
        { slug: "rules", label: "Rule book →" },
        { slug: "datenschutz", label: "Datenschutz →" },
      ]}
    >
      {/* The raw HTML comes from a markdown source we control, never
          a user-supplied string, and `html: false` already escapes
          inline HTML in the source. dangerouslySetInnerHTML is the
          only way to mount a markdown-it tree without React rebuild
          overhead per content edit. */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </DocPage>
  );
}
