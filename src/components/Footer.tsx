/**
 * Site footer.
 *
 * Carries the German-law-required links to the Impressum (§ 5 DDG) and
 * Datenschutzerklärung (Art. 13 DSGVO). Both pages live behind the
 * `#/impressum` and `#/datenschutz` hash routes so the SPA can render
 * them without a backend round-trip.
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
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
        <span>Astraudit · {new Date().getFullYear()}</span>
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
      </div>
    </footer>
  );
}
