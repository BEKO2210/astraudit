/**
 * <LocaleSwitcher /> — Roadmap M4.2.
 *
 * Compact <select> in the app header. Reads + writes the active
 * locale via the i18n provider. Deliberately not a custom dropdown:
 *   - Native <select> is bulletproof on keyboard, mobile, and AT.
 *   - Theme styles inherit from the existing header chrome.
 *   - One round‑trip per locale change, no animation budget.
 */

import { useId } from "react";
import { Languages } from "lucide-react";
import {
  LOCALES,
  LOCALE_LABELS,
  useTranslation,
  type Locale,
} from "../lib/i18n";

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useTranslation();
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300 transition hover:border-white/20"
    >
      <Languages className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
      <span className="sr-only">{t("switcher.language")}</span>
      <select
        id={id}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="cursor-pointer bg-transparent text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora-violet/60"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} className="bg-slate-900 text-slate-100">
            {LOCALE_LABELS[l].native}
          </option>
        ))}
      </select>
    </label>
  );
}
