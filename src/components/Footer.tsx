export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/5 py-8 print:mt-8 print:border-slate-200 print:py-4">
      <div className="text-xs text-slate-500">
        Browser-only static analysis. No code execution. No backend. Public
        repositories only. An optional GitHub PAT, if you provide one, never
        leaves this browser.
      </div>
      <div className="mt-2 text-[11px] text-slate-600">
        Astraudit · {new Date().getFullYear()} · Built with Vite, React, and
        GitHub's public API.
      </div>
    </footer>
  );
}
