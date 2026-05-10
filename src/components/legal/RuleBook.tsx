/**
 * <RuleBook /> — Phase 4.5.
 *
 * Renders `docs/RULES.md` as the in-app rule book at `#/rules`. The
 * markdown is imported as a raw string at build time (Vite `?raw`)
 * so there's no extra fetch + the content is bundled into the main
 * chunk only on demand. We re-use the existing `markdown-it`
 * dependency (already in the bundle for the README preview) instead
 * of pulling another renderer.
 *
 * Why a real markdown render rather than ReactNode children? Two
 * reasons:
 *   1. The same file (`docs/RULES.md`) is the canonical doc on
 *      GitHub. Maintaining one source means there's no drift between
 *      the in-app view and the rendered repo doc.
 *   2. New rule entries land via plain Markdown — no JSX edits, no
 *      build-step regeneration. Future contributors only need to
 *      know how to edit a markdown table.
 */

import MarkdownIt from "markdown-it";
import { useMemo } from "react";
// `?raw` is a Vite import attribute that yields the file contents as
// a string at build time. The markdown lives at the repo root under
// `docs/` so a contributor editing the rule book never has to know
// that the in-app page exists.
import RULES_MD from "../../../docs/RULES.md?raw";
import { DocPage } from "./DocPage";

/** Single shared markdown-it instance — instantiating it once per
 *  render would re-compile every plugin chain. `html: false` keeps
 *  the same XSS-defensive baseline as the README preview. */
const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

/**
 * Drop the markdown's leading `# Astraudit rule book` heading so
 * the in-app render has exactly one <h1> — the DocPage title above
 * the markdown body. Two <h1>s would break the WCAG-required
 * heading hierarchy and confuse screen readers about what page
 * they landed on. The GitHub view still gets the heading because
 * GitHub shows the file's first H1 as the page banner regardless.
 */
function stripLeadingH1(source: string): string {
  return source.replace(/^\s*#[^\n]*\n+/, "");
}

export function RuleBook() {
  const html = useMemo(() => md.render(stripLeadingH1(RULES_MD)), []);
  return (
    <DocPage
      title="Astraudit rule book"
      backLabel="Back to app"
      nav={[
        { slug: "impressum", label: "Impressum →" },
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
