/**
 * Site footer.
 *
 * Carries:
 *   - the Phase 4.5 rule book at `#/rules`,
 *   - the German-law-required Impressum (§ 5 DDG) at `#/impressum`,
 *   - the DSGVO-compliant Datenschutzerklärung at `#/datenschutz`.
 * All three render as stand-alone hash routes so the SPA serves them
 * without a backend round-trip.
 */
export function Footer() {
  const base = import.meta.env.BASE_URL;
  return (
    <footer className="mt-20 border-t border-white/5 py-8 print:mt-8 print:border-slate-200 print:py-4">
      <div className="text-xs text-slate-500">
        Browser-only static analysis. No code execution. No backend. Public
        repositories only. An optional GitHub PAT, if you provide one, never
        leaves this browser.
      </div>
      {/* Phase 5.2 — wrapped in <p> so the doc-page links count as
          *inline text links* under WCAG 2.5.8's documented
          exception. The visual layout is identical (flex-wrap on a
          paragraph still flows the way the footer expects). */}
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
        <span>Astraudit · {new Date().getFullYear()}</span>
        <span className="text-slate-700">·</span>
        <a
          href={`${base}#/rules`}
          className="text-slate-500 transition hover:text-aurora-cyan hover:underline"
        >
          Rule book
        </a>
        <span className="text-slate-700">·</span>
        <a
          href="https://github.com/BEKO2210/astraudit/blob/main/docs/mcp.md"
          target="_blank"
          rel="noreferrer"
          className="text-slate-500 transition hover:text-aurora-cyan hover:underline"
        >
          Use from your AI
        </a>
        <span className="text-slate-700">·</span>
        <a
          href={`${base}#/impressum`}
          className="text-slate-500 transition hover:text-aurora-cyan hover:underline"
        >
          Impressum
        </a>
        <span className="text-slate-700">·</span>
        <a
          href={`${base}#/datenschutz`}
          className="text-slate-500 transition hover:text-aurora-cyan hover:underline"
        >
          Datenschutz
        </a>
        <span className="text-slate-700">·</span>
        <span>Built with Vite, React, and GitHub's public API.</span>
      </p>
    </footer>
  );
}
