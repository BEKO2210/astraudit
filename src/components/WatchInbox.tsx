/**
 * <WatchInbox /> — Roadmap M7.1.4.
 *
 * Surfaces the `WatchEvent`s produced by the background
 * refresh loop. Lists events newest-first, lets the visitor
 * mark single events or the whole list as read, and links each
 * row out to a fresh single-repo audit for context.
 *
 * Storage lives entirely in watchEventStore — this component
 * is a pure view + dispatcher.
 */
import { Bell, BellOff, CheckCheck, ExternalLink, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDialog } from "../lib/ui/useDialog";
import {
  clearAllEvents,
  listEvents,
  markAllEventsRead,
  markEventRead,
  type WatchEventRecord,
} from "../lib/watch/eventStore";
import { formatRelative } from "../lib/utils/formatDate";
import { useTranslation } from "../lib/i18n";
import { pushToast } from "../lib/ui/toastStore";

interface WatchInboxProps {
  open: boolean;
  onClose: () => void;
  onPick: (fullName: string) => void;
}

export function WatchInbox({ open, onClose, onPick }: WatchInboxProps) {
  const { t } = useTranslation();
  const [reloadTick, setReloadTick] = useState(0);
  const events = useMemo<WatchEventRecord[]>(
    () => (open ? listEvents() : []),
    [open, reloadTick],
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog({ open, onClose, containerRef: dialogRef });
  const titleId = useId();

  useEffect(() => {
    if (open) setReloadTick((n) => n + 1);
  }, [open]);

  if (!open) return null;

  const handleMarkAll = () => {
    if (events.length === 0) return;
    markAllEventsRead();
    setReloadTick((n) => n + 1);
    pushToast({ tone: "success", message: t("inbox.allReadToast") });
  };

  const handleClear = () => {
    clearAllEvents();
    setReloadTick((n) => n + 1);
    pushToast({ tone: "info", message: t("inbox.clearedToast") });
  };

  const handleOpen = (record: WatchEventRecord) => {
    markEventRead(record.id);
    onClose();
    onPick(record.event.fullName);
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
          aria-label={t("inbox.close")}
          className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <Bell className="h-4 w-4 text-aurora-amber" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-white">
              {t("inbox.title")}
            </h2>
            <p className="text-xs text-slate-500">{t("inbox.subtitle")}</p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="mt-6 rounded-lg border border-white/5 bg-white/[0.02] p-4 text-sm text-slate-400">
            <div className="mb-2 inline-flex items-center gap-2 text-aurora-amber">
              <BellOff className="h-3.5 w-3.5" />
              <span className="font-medium text-white">{t("inbox.empty")}</span>
            </div>
            <p className="text-xs">{t("inbox.emptyHint")}</p>
          </div>
        ) : (
          <>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/[0.06]"
              >
                <CheckCheck className="h-3 w-3" />
                {t("inbox.markAllRead")}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-400 hover:bg-white/[0.06]"
              >
                {t("inbox.clear")}
              </button>
            </div>
            <ul className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {events.map((record) => (
                <EventRow
                  key={record.id}
                  record={record}
                  onOpen={() => handleOpen(record)}
                  onMarkRead={() => {
                    markEventRead(record.id);
                    setReloadTick((n) => n + 1);
                  }}
                  t={t}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function EventRow({
  record,
  onOpen,
  onMarkRead,
  t,
}: {
  record: WatchEventRecord;
  onOpen: () => void;
  onMarkRead: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const { event } = record;
  const tone = toneFor(event.kind);
  const label = labelFor(event.kind, t);
  const detail =
    event.delta != null
      ? `${event.before} → ${event.after} (${event.delta > 0 ? "+" : ""}${event.delta})`
      : `${event.before} → ${event.after}`;
  return (
    <li
      className={`overflow-hidden rounded-xl border bg-white/[0.02] p-3 transition ${
        record.read
          ? "border-white/5 opacity-70"
          : "border-aurora-amber/20"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`pill border ${tone}`}>{label}</span>
            <span className="text-xs font-medium text-white">
              {event.fullName}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {detail} · {formatRelative(event.occurredAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!record.read ? (
            <button
              type="button"
              onClick={onMarkRead}
              aria-label={t("inbox.markRead")}
              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/[0.06]"
            >
              {t("inbox.markRead")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-aurora-cyan hover:bg-white/[0.06]"
          >
            {t("inbox.openAudit")}
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </li>
  );
}

function toneFor(kind: string): string {
  switch (kind) {
    case "score-up":
    case "findings-down":
      return "text-aurora-mint border-aurora-mint/40";
    case "score-down":
    case "findings-up":
      return "text-risk-medium border-risk-medium/40";
    case "grade-changed":
      return "text-aurora-cyan border-aurora-cyan/40";
    default:
      return "text-slate-400 border-white/10";
  }
}

function labelFor(
  kind: string,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  switch (kind) {
    case "score-up":
      return t("inbox.kindScoreUp");
    case "score-down":
      return t("inbox.kindScoreDown");
    case "findings-up":
      return t("inbox.kindFindingsUp");
    case "findings-down":
      return t("inbox.kindFindingsDown");
    case "grade-changed":
      return t("inbox.kindGradeChanged");
    default:
      return kind;
  }
}
