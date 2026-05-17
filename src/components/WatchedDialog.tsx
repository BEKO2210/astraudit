/**
 * <WatchedDialog /> — Roadmap M7.1.2.
 *
 * Lists every repository the visitor has marked as "watch this"
 * via the StickyScoreBar's Watch button. Each row surfaces the
 * baseline snapshot recorded at watch‑time (or after the M7.1.3
 * background refresh runs) and lets the visitor unwatch or
 * re‑audit one click away.
 *
 * Pure read‑modify cycle on `localStorage` via watchStore — the
 * background loop in M7.1.3 will mutate the same store, and an
 * Esc / outside‑click reload picks up its changes.
 */

import { Eye, EyeOff, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDialog } from "../lib/ui/useDialog";
import {
  listWatched,
  unwatchRepo,
  type WatchedRepo,
} from "../lib/watch/watchStore";
import { formatRelative } from "../lib/utils/formatDate";
import { pushToast } from "../lib/ui/toastStore";
import { useTranslation } from "../lib/i18n";

interface WatchedDialogProps {
  open: boolean;
  onClose: () => void;
  /** Pick a repo from the list — wire into the audit pipeline. */
  onPick: (fullName: string) => void;
}

export function WatchedDialog({ open, onClose, onPick }: WatchedDialogProps) {
  const { t } = useTranslation();
  const [reloadTick, setReloadTick] = useState(0);
  const items = useMemo<WatchedRepo[]>(
    () => (open ? listWatched() : []),
    [open, reloadTick],
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog({ open, onClose, containerRef: dialogRef });
  const titleId = useId();

  useEffect(() => {
    if (open) setReloadTick((n) => n + 1);
  }, [open]);

  if (!open) return null;

  const handleUnwatch = (entry: WatchedRepo) => {
    unwatchRepo({ owner: entry.owner, repo: entry.repo });
    setReloadTick((n) => n + 1);
    pushToast({ tone: "info", message: t("sticky.watchRemoved") });
  };

  const handlePick = (entry: WatchedRepo) => {
    onClose();
    onPick(`${entry.owner}/${entry.repo}`);
  };

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
        className="bottom-sheet-card glass-strong relative w-full max-w-lg rounded-2xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("watched.close")}
          className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <Eye className="h-4 w-4 text-aurora-amber" />
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-white">
              {t("watched.title")}
            </h2>
            <p className="text-xs text-slate-500">{t("watched.subtitle")}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="mt-6 rounded-lg border border-white/5 bg-white/[0.02] p-4 text-sm text-slate-400">
            {t("watched.empty")}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {items.map((entry) => (
              <li
                key={entry.fullName}
                className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handlePick(entry)}
                    className="min-w-0 flex-1 text-left text-sm font-semibold text-white hover:text-aurora-cyan"
                  >
                    {entry.fullName}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnwatch(entry)}
                    aria-label={t("sticky.unwatchAria")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/[0.06]"
                  >
                    <EyeOff className="h-3 w-3" />
                    {t("watched.unwatch")}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                  <Stat
                    label={t("watched.scoreLabel")}
                    value={
                      entry.lastScore != null && entry.lastMaxScore != null
                        ? `${entry.lastScore}/${entry.lastMaxScore}`
                        : "—"
                    }
                  />
                  <Stat
                    label={t("watched.gradeLabel")}
                    value={entry.lastGrade ?? "—"}
                  />
                  <Stat
                    label={t("watched.findingsLabel")}
                    value={
                      entry.lastFindingCount != null
                        ? String(entry.lastFindingCount)
                        : "—"
                    }
                  />
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  {entry.lastCheckedAt
                    ? `${t("watched.lastCheckedPrefix")} ${formatRelative(entry.lastCheckedAt)}`
                    : t("watched.neverChecked")}
                  {" · "}
                  {t("watched.intervalPrefix")} {entry.intervalHours}h
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/5 bg-black/20 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
