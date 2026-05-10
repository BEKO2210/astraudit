/**
 * `<EmptyPanelState />` — Phase 5.5.
 *
 * Shared "this panel has nothing to show" affordance. Replaces both
 * the old `return null` (which silently dropped a section the user
 * was expecting) and the awkward "panel with empty body" pattern
 * (which left a card chrome wrapped around nothing). One coherent
 * card with an icon, a one-line headline, and an optional
 * description so every panel speaks the same emptiness language.
 *
 * Sized to fit the existing `.glass` card slot exactly so a panel
 * swap from "data" to "no data" never reflows the surrounding
 * layout.
 */

import type { ReactNode } from "react";

interface EmptyPanelStateProps {
  /** Lucide icon component, e.g. `Sparkles` from `lucide-react`. */
  icon: React.ComponentType<{ className?: string }>;
  /** Short headline, ≤ ~50 chars. The card-title style gets applied
   *  so it visually matches a regular section header. */
  title: string;
  /** Optional one-line description expanding on the title. */
  description?: ReactNode;
  /** Optional subtle accent class for the icon (e.g.
   *  `text-aurora-mint`). Defaults to slate. */
  accentClass?: string;
}

export function EmptyPanelState({
  icon: Icon,
  title,
  description,
  accentClass = "text-slate-400",
}: EmptyPanelStateProps) {
  return (
    <section className="glass flex flex-col items-center gap-2 p-6 text-center">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]"
        aria-hidden="true"
      >
        <Icon className={`h-4 w-4 ${accentClass}`} />
      </span>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {description ? (
        <p className="max-w-md text-xs text-slate-400">{description}</p>
      ) : null}
    </section>
  );
}
