import { Keyboard, X } from "lucide-react";
import { useId, useRef } from "react";
import { useDialog } from "../lib/ui/useDialog";
import { useTranslation, type TranslationKey } from "../lib/i18n";

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

// Roadmap M4.3 slice 5b — keys stay literal (they ARE the keys
// the user presses); only the explanatory label is translated.
const ROWS: Array<{ keys: string[]; labelKey: TranslationKey }> = [
  { keys: ["⌘", "K"], labelKey: "shortcuts.openPalette" },
  { keys: ["Ctrl", "K"], labelKey: "shortcuts.openPaletteWinLinux" },
  { keys: ["/"], labelKey: "shortcuts.focusInput" },
  { keys: ["?"], labelKey: "shortcuts.showSheet" },
  { keys: ["Esc"], labelKey: "shortcuts.closeDialog" },
  { keys: ["g", "o"], labelKey: "shortcuts.jumpOverview" },
  { keys: ["g", "s"], labelKey: "shortcuts.jumpScore" },
  { keys: ["g", "t"], labelKey: "shortcuts.jumpStory" },
  { keys: ["g", "r"], labelKey: "shortcuts.jumpReadme" },
  { keys: ["g", "i"], labelKey: "shortcuts.jumpInsights" },
  { keys: ["g", "g"], labelKey: "shortcuts.jumpGraph" },
  { keys: ["g", "f"], labelKey: "shortcuts.jumpFindings" },
  { keys: ["g", "c"], labelKey: "shortcuts.jumpStructure" },
  { keys: ["g", "k"], labelKey: "shortcuts.jumpStack" },
  { keys: ["g", "m"], labelKey: "shortcuts.jumpMaintenance" },
  { keys: ["g", "b"], labelKey: "shortcuts.jumpOnboarding" },
  { keys: ["g", "n"], labelKey: "shortcuts.jumpNext" },
];

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  const { t } = useTranslation();
  // Phase 5.3 — focus trap + restore + body lock + Esc.
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog({ open, onClose, containerRef: dialogRef });
  const titleId = useId();

  if (!open) return null;
  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="bottom-sheet-card glass-strong relative w-full max-w-md rounded-2xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("shortcuts.close")}
          className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <Keyboard className="h-4 w-4 text-aurora-cyan" />
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-white">
              {t("shortcuts.title")}
            </h2>
            <p className="text-xs text-slate-500">{t("shortcuts.subtitle")}</p>
          </div>
        </div>

        <div className="mt-4 max-h-[60vh] space-y-1 overflow-y-auto pr-1 scrollbar-thin">
          {ROWS.map((row, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5 text-sm text-slate-300"
            >
              <span className="min-w-0 flex-1 break-words">
                {t(row.labelKey)}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {row.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[11px] text-slate-300"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
