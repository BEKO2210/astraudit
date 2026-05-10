/**
 * Generic full-screen documentation chrome — Phase 4.5 + 5.x.
 *
 * Reusable shell shared by the German legal pages (Impressum +
 * Datenschutzerklärung) and the English-language rule book. Renders
 * a back-to-app link, an optional secondary nav (e.g. "Datenschutz →",
 * "Impressum →"), the page title as `<h1>`, and the body inside
 * `.legal-prose` typography. Deep links work because the page is a
 * stand-alone view that takes precedence over the audit UI in
 * `App.tsx`'s router.
 */

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export interface DocPageNav {
  /** URL hash slug (without the leading `#/`). */
  slug: string;
  /** User-visible label, e.g. `"Datenschutz →"`. */
  label: string;
}

interface DocPageProps {
  title: string;
  /** Label for the back link. Defaults to "Back to app" so the
   *  English-language pages don't end up with German chrome. */
  backLabel?: string;
  /** Optional cross-links rendered on the right side of the header. */
  nav?: DocPageNav[];
  children: ReactNode;
}

export function DocPage({
  title,
  backLabel = "Back to app",
  nav = [],
  children,
}: DocPageProps) {
  const base = import.meta.env.BASE_URL;
  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <a
          href={`${base}#`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </a>
        {nav.length > 0 ? (
          <nav className="flex flex-wrap items-center gap-3">
            {nav.map((link) => (
              <a
                key={link.slug}
                href={`${base}#/${link.slug}`}
                className="text-xs font-medium text-aurora-cyan hover:underline"
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}
      </header>

      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {title}
      </h1>

      <div className="legal-prose mt-8 text-sm leading-relaxed text-slate-300">
        {children}
      </div>

      <footer className="mt-12 border-t border-white/5 pt-6 text-[11px] text-slate-500">
        Astraudit · {new Date().getFullYear()} · Browser-only static analysis.
      </footer>
    </div>
  );
}
