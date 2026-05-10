import { ArrowLeftRight, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { EXAMPLE_REPOS } from "../data/exampleRepos";

interface CompareDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rawRight: string) => void;
  /** The repo we are comparing against (already audited or in compare-state). */
  leftLabel: string;
}

export function CompareDialog({
  open,
  onClose,
  onSubmit,
  leftLabel,
}: CompareDialogProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue("");
    setTimeout(() => inputRef.current?.focus(), 50);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value);
  };

  const examples = leftLabel
    ? EXAMPLE_REPOS.filter(
        (r) => r.fullName.toLowerCase() !== leftLabel.toLowerCase(),
      )
    : EXAMPLE_REPOS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="glass-strong relative w-full max-w-lg rounded-2xl p-5 sm:p-6"
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
            <ArrowLeftRight className="h-4 w-4 text-aurora-cyan" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Compare</h2>
            {leftLabel ? (
              <p className="text-xs text-slate-500">
                <span className="font-mono text-slate-300">{leftLabel}</span>{" "}
                will be the left-hand side.
              </p>
            ) : null}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Right-hand repository
          </label>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="owner/repo or full GitHub URL"
            spellCheck={false}
            autoComplete="off"
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-aurora-cyan/40"
          />
          <button
            type="submit"
            className="mt-3 inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-aurora-violet to-aurora-blue px-4 py-2 text-sm font-semibold text-white shadow-glow"
          >
            Run compare
          </button>
        </form>

        {examples.length > 0 ? (
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Or pick an example
            </p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {examples.map((r) => (
                <button
                  key={r.fullName}
                  type="button"
                  onClick={() => onSubmit(r.fullName)}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-left text-xs text-slate-300 transition hover:border-aurora-cyan/40 hover:text-white"
                >
                  <span className="font-medium">{r.fullName}</span>
                  <span className="ml-2 text-slate-500">{r.blurb}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <p className="mt-4 text-[11px] text-slate-500">
          Both audits run in parallel. Results from the cache are reused for
          either side.
        </p>
      </div>
    </div>
  );
}
