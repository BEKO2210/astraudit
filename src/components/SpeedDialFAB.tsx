/**
 * <SpeedDialFAB /> — mobile-only floating action menu.
 *
 * Phase 2.8.4 design notes (Material 3 FAB / Speed Dial, Mobbin
 * thumb-zone research, Apple HIG, Danny Payne on FAB a11y):
 *
 * - Material 3 / Mobbin: only one FAB per screen. To still expose
 *   secondary actions we use the Speed Dial pattern: a single main
 *   FAB that expands into 2-4 mini-FABs above it on tap.
 * - Bottom-right placement targets the right-handed thumb zone
 *   (statistically the majority); the menu opens upward so labels
 *   stay above the thumb, not under it.
 * - Touch targets follow Material 3: main FAB 56×56, mini items
 *   are extended pills (~44 px tall) so the visible label keeps
 *   accessibility for icon-only confusion avoidance (M3, WCAG 4.1.2).
 * - aria-haspopup="menu" + aria-expanded reflect the disclosure
 *   state; aria-controls links to the menu container; mini items
 *   are role="menuitem". Esc and outside-click close the menu.
 * - tabIndex toggles to -1 while collapsed so keyboard users don't
 *   tab into invisible chrome (otherwise focus order goes through
 *   off-screen items — Danny Payne's accessibility caveat for
 *   absolutely positioned FABs).
 * - Hidden on `sm:` and above (desktop has the full action cluster
 *   in the StickyScoreBar) and on print.
 *
 * Sources:
 *   - https://m3.material.io/components/floating-action-button/guidelines
 *   - https://mobbin.com/glossary/floating-action-button
 *   - https://danny-payne.medium.com/accessibility-options-for-floating-action-buttons-99bdf8146988
 *   - https://elaris.software/blog/mobile-ux-thumb-zones-2025/
 */

import { Plus, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ComponentType } from "react";

export interface SpeedDialAction {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  /** Optional accent class for the mini button background. */
  toneClass?: string;
}

interface SpeedDialFABProps {
  actions: SpeedDialAction[];
  /** Override the floating button label (default "Quick actions"). */
  ariaLabel?: string;
  /** Hide entirely (e.g. while a dialog is open). */
  hidden?: boolean;
}

export function SpeedDialFAB({
  actions,
  ariaLabel = "Quick actions",
  hidden = false,
}: SpeedDialFABProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Close on Esc + outside click. Tracked together so adding/removing
  // listeners is cheap.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        // Restore focus to the main FAB so the user can re-open with
        // Space / Enter without re-tabbing.
        mainRef.current?.focus();
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      const node = rootRef.current;
      if (!node) return;
      if (node.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  if (hidden || actions.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2 sm:hidden print:hidden"
      // Speed-dial root never traps focus; we only manage tabIndex on
      // the mini items so collapsed state stays out of the tab order.
    >
      {/* Mini FAB stack — appears above main FAB on tap. */}
      <div
        id={menuId}
        role="menu"
        aria-label={`${ariaLabel} menu`}
        aria-hidden={!open}
        className={`flex flex-col items-end gap-2 transition-all duration-200 motion-reduce:transition-none ${
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        {actions.map((action, idx) => {
          const Icon = action.icon;
          // Stagger the slide animation slightly so items appear in order.
          const delay = open ? `${idx * 30}ms` : "0ms";
          return (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              aria-label={action.label}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              style={{ transitionDelay: delay }}
              className={`inline-flex h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm font-medium text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur transition-all duration-200 motion-reduce:transition-none active:scale-[0.97] ${action.toneClass ?? "bg-ink-800/95 hover:bg-ink-700/95"}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main FAB (toggle) */}
      <button
        ref={mainRef}
        type="button"
        aria-label={open ? `Close ${ariaLabel} menu` : `Open ${ariaLabel} menu`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-aurora-violet to-aurora-blue text-white shadow-glow transition motion-reduce:transition-none active:scale-95 ${
          open ? "rotate-45" : "rotate-0"
        }`}
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden />
        ) : (
          <Plus className="h-5 w-5" aria-hidden />
        )}
      </button>
    </div>
  );
}
