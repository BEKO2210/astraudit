import { Keyboard, X } from "lucide-react";
import { useEffect } from "react";

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

const ROWS: Array<{ keys: string[]; label: string }> = [
  { keys: ["⌘", "K"], label: "Open the command palette" },
  { keys: ["Ctrl", "K"], label: "Open the command palette (Windows / Linux)" },
  { keys: ["/"], label: "Focus the repository input" },
  { keys: ["?"], label: "Show this cheat sheet" },
  { keys: ["Esc"], label: "Close the active dialog" },
  { keys: ["g", "o"], label: "Jump to Overview" },
  { keys: ["g", "s"], label: "Jump to Score" },
  { keys: ["g", "t"], label: "Jump to Story" },
  { keys: ["g", "r"], label: "Jump to README" },
  { keys: ["g", "i"], label: "Jump to Insights" },
  { keys: ["g", "g"], label: "Jump to Graph" },
  { keys: ["g", "f"], label: "Jump to Findings" },
  { keys: ["g", "c"], label: "Jump to Structure (code)" },
  { keys: ["g", "k"], label: "Jump to Stack" },
  { keys: ["g", "m"], label: "Jump to Maintenance" },
  { keys: ["g", "b"], label: "Jump to Onboarding (build)" },
  { keys: ["g", "n"], label: "Jump to Next steps" },
];

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="glass-strong relative w-full max-w-md rounded-2xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <Keyboard className="h-4 w-4 text-aurora-cyan" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Keyboard shortcuts
            </h2>
            <p className="text-xs text-slate-500">
              Two-key chords ("g s") expect both keys within ~1 second.
            </p>
          </div>
        </div>

        <div className="mt-4 max-h-[60vh] space-y-1 overflow-y-auto pr-1 scrollbar-thin">
          {ROWS.map((row, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5 text-sm text-slate-300"
            >
              <span className="min-w-0 flex-1 break-words">{row.label}</span>
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
