/**
 * <StackMatesDialog /> — Roadmap M4.1 UI slice.
 *
 * Lazy‑opens after the user clicks "Find similar repos" on the
 * audit dashboard. Fetches up to five candidates via
 * `discoverStackMates`, ranks them, and lists each with its
 * similarity reasons + a one‑click "Audit this" CTA that opens
 * the candidate as its own Astraudit hash route.
 *
 * Deliberately simple:
 *   - No compare‑mode priming yet (that's a follow‑up; the
 *     existing CompareDialog flow has its own UX and folding the
 *     two together risks confusing the picker affordance).
 *   - No favouriting / pinning / saving (would need persistence;
 *     watch‑this‑repo is a separate Monat 7 item).
 *   - No re‑fetch button (a fresh audit is a fresh dialog open).
 */

import { Sparkles, X, ArrowUpRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useDialog } from "../lib/ui/useDialog";
import {
  discoverStackMates,
  type StackMate,
  type StackMateBase,
} from "../lib/github/discoverStackMates";

interface StackMatesDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * The base repo we discover stack‑mates for. Derived from the
   * audit result's metadata. When `null`, the dialog renders an
   * "audit a repo first" hint instead of fetching.
   */
  base: StackMateBase | null;
}

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; mates: StackMate[] }
  | { kind: "error"; message: string };

export function StackMatesDialog({ open, onClose, base }: StackMatesDialogProps) {
  const [state, setState] = useState<FetchState>({ kind: "idle" });
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog({ open, onClose, containerRef: dialogRef });
  const titleId = useId();

  useEffect(() => {
    if (!open || !base) {
      setState({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    discoverStackMates(base, { limit: 5 })
      .then((mates) => {
        if (cancelled) return;
        setState({ kind: "ready", mates });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message: (err as Error)?.message ?? "Discovery failed",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [open, base]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur sm:items-center"
    >
      <div className="bottom-sheet-card max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              id={titleId}
              className="flex items-center gap-2 text-lg font-semibold text-white"
            >
              <Sparkles className="h-5 w-5 text-aurora-violet" />
              Similar repos
            </h2>
            {base ? (
              <p className="mt-1 text-sm text-slate-400">
                Stack‑mates for{" "}
                <span className="font-mono text-slate-300">
                  {base.fullName}
                </span>{" "}
                — same language, overlapping topics, similar tier.
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-400">
                Audit a repo first to see its stack‑mates.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.kind === "loading" ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Searching GitHub…
          </p>
        ) : null}

        {state.kind === "error" ? (
          <p className="py-6 text-center text-sm text-rose-400">
            {state.message}
          </p>
        ) : null}

        {state.kind === "ready" && state.mates.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No similar repos surfaced from the current query. Try a
            repo with declared topics + a primary language for the
            richest results.
          </p>
        ) : null}

        {state.kind === "ready" && state.mates.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {state.mates.map((m) => (
              <li
                key={m.fullName}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-aurora-violet/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-medium text-white">
                      {m.fullName}
                    </p>
                    {m.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                        {m.description}
                      </p>
                    ) : null}
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {m.reasons.map((r) => (
                        <li key={r}>· {r}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className="inline-flex items-center rounded-full bg-aurora-violet/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-aurora-violet"
                      aria-label={`Similarity ${Math.round(m.similarity * 100)} percent`}
                    >
                      {Math.round(m.similarity * 100)}%
                    </span>
                    <a
                      href={`#/audit/${m.fullName}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1 rounded-lg bg-aurora-violet/15 px-2.5 py-1 text-xs font-medium text-aurora-violet transition hover:bg-aurora-violet/25"
                    >
                      Audit
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
