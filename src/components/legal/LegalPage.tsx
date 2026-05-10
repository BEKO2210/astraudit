/**
 * Shared chrome for the German legal pages (Impressum +
 * Datenschutzerklärung).
 *
 * Both pages render as a stand-alone full-screen view (the audit UI
 * is unmounted while the user reads them) so the legal content is
 * readable without distractions and works correctly when the user
 * deep-links to the pages.
 *
 * The chrome carries:
 *   - The Astraudit wordmark + logo with a link back to the app root
 *     so visitors can navigate out of the legal page.
 *   - Cross-links to the other legal page so a user who landed on
 *     `#/impressum` can reach the privacy policy with one click,
 *     which the BGH and Datenschutzbehörden expect for a compliant
 *     site.
 */

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface LegalPageProps {
  title: string;
  /** Slug of the *other* legal page so we can render its cross-link. */
  otherSlug: "impressum" | "datenschutz";
  otherLabel: string;
  children: ReactNode;
}

export function LegalPage({
  title,
  otherSlug,
  otherLabel,
  children,
}: LegalPageProps) {
  const base = import.meta.env.BASE_URL;
  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex items-center justify-between gap-3">
        <a
          href={`${base}#`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurück zur App
        </a>
        <a
          href={`${base}#/${otherSlug}`}
          className="text-xs font-medium text-aurora-cyan hover:underline"
        >
          {otherLabel}
        </a>
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
