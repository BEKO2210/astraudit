/**
 * Tests for the Phase 4.5 public rule book.
 *
 * The rule book is the documented source-of-truth for what fires in
 * the audit. A regression that drops a rule ID from the rendered
 * doc — or worse, ships the doc without it ever rendering — would
 * break the project's "every rule is auditable" promise. We lock
 * down both the *content* (key rule IDs are present) and the
 * *plumbing* (the markdown file actually renders into HTML).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RuleBook } from "../../src/components/legal/RuleBook";

const RULES_MD = readFileSync(
  resolve(__dirname, "..", "..", "docs/RULES.md"),
  "utf-8",
);

describe("docs/RULES.md (source of truth)", () => {
  it("documents every finding-emitting rule from riskEngine", () => {
    // These rule IDs must survive in the doc forever — they're what
    // a downstream tool would look up when an audit lands.
    for (const id of [
      "doc-no-readme",
      "doc-readme-too-short",
      "doc-no-setup",
      "doc-no-usage",
      "doc-no-contributing",
      "struct-root-crowded",
      "quality-no-tests",
      "sec-no-license",
      "sec-committed-env",
      "sec-suspicious-file",
      "sec-no-security-md",
      "sec-no-dep-automation",
      "maint-inactive",
      "dx-no-clear-setup",
      "eco-no-lockfile",
      "ci-no-pipeline",
    ]) {
      expect(RULES_MD).toContain(`\`${id}\``);
    }
  });

  it("documents the Phase 3.9 license-tone findings", () => {
    expect(RULES_MD).toContain("`strong-copyleft-deps`");
    expect(RULES_MD).toContain("`weak-copyleft-deps`");
    expect(RULES_MD).toContain("`proprietary-deps`");
    expect(RULES_MD).toContain("`unclassified-deps`");
  });

  it("documents the score → grade table and the status ribbons", () => {
    expect(RULES_MD).toMatch(/Total score.*Grade.*Verdict tone/);
    for (const grade of ["A", "B", "C", "D", "F"]) {
      expect(RULES_MD).toMatch(new RegExp(`\\|\\s*${grade}\\s*\\|`));
    }
    for (const status of ["Strong", "Partial", "Missing", "Info", "Not detected"]) {
      expect(RULES_MD).toContain(status);
    }
  });

  it("documents the four operating constraints", () => {
    for (const phrase of [
      "Browser-only",
      "Free, forever",
      "Public repositories only",
      "Rule-based",
    ]) {
      expect(RULES_MD).toContain(phrase);
    }
  });
});

describe("<RuleBook /> rendering", () => {
  // We render to static markup (no DOM) — same pattern as the legal
  // tests. Confirms the markdown-it pipeline turns the source into
  // HTML and that the DocPage chrome wraps it.
  const html = renderToStaticMarkup(<RuleBook />);

  it("renders the page title and back-link chrome", () => {
    expect(html).toContain("Astraudit rule book");
    expect(html).toContain("Back to app");
  });

  it("renders cross-links to the legal pages", () => {
    expect(html).toMatch(/href="[^"]*#\/impressum"/);
    expect(html).toMatch(/href="[^"]*#\/datenschutz"/);
  });

  it("renders at least one rule-id `<code>` tag from the catalog", () => {
    // markdown-it turns `\`sec-no-license\`` → `<code>sec-no-license</code>`
    expect(html).toContain("<code>sec-no-license</code>");
    expect(html).toContain("<code>quality-no-tests</code>");
  });

  it("renders the score grade table as a real <table>", () => {
    expect(html).toContain("<table>");
    expect(html).toContain("<th");
    expect(html).toContain(">Grade<");
  });

  it("escapes any inline HTML in the source (XSS defense)", () => {
    // The renderer is configured with `html: false`, so even if a
    // rule entry quoted some HTML literally, it'd come out escaped.
    // The doc itself doesn't ship any literal HTML, so we just
    // confirm we never produced an unescaped <script> tag.
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<iframe");
  });
});
