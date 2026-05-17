import { Clock, History, Star, Trash2, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDialog } from "../lib/ui/useDialog";
import {
  clearAll,
  listFavorites,
  listHistory,
  removeEntry,
  toggleFavorite,
  type HistoryEntry,
} from "../lib/history/historyStore";
import { formatRelative } from "../lib/utils/formatDate";
import { pushToast } from "../lib/ui/toastStore";
import { useTranslation } from "../lib/i18n";

interface HistoryDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (fullName: string) => void;
  /** Bumped each time the audit history changes, to force re-load. */
  tick: number;
}

type TabKey = "favorites" | "recent";

export function HistoryDialog({
  open,
  onClose,
  onPick,
  tick,
}: HistoryDialogProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>("recent");
  const [reloadTick, setReloadTick] = useState(0);

  const recent = useMemo(() => (open ? listHistory() : []), [open, tick, reloadTick]);
  const favorites = useMemo(
    () => (open ? listFavorites() : []),
    [open, tick, reloadTick],
  );

  useEffect(() => {
    if (!open) return;
    setTab(favorites.length > 0 ? "favorites" : "recent");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Phase 5.3 — focus trap + restore + body lock + Esc.
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog({ open, onClose, containerRef: dialogRef });
  const titleId = useId();

  if (!open) return null;

  const handlePick = (entry: HistoryEntry) => {
    onClose();
    onPick(`${entry.owner}/${entry.repo}`);
  };

  const handleStar = (entry: HistoryEntry) => {
    toggleFavorite({ owner: entry.owner, repo: entry.repo });
    setReloadTick((t) => t + 1);
  };

  const handleRemove = (entry: HistoryEntry) => {
    removeEntry({ owner: entry.owner, repo: entry.repo });
    setReloadTick((t) => t + 1);
  };

  const handleClearAll = () => {
    const total = recent.length + favorites.length;
    clearAll();
    setReloadTick((t) => t + 1);
    if (total > 0) {
      pushToast({ tone: "success", message: t("history.toastCleared") });
    }
  };

  const items = tab === "favorites" ? favorites : recent;

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
          aria-label={t("history.close")}
          className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <History className="h-4 w-4 text-aurora-cyan" />
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-white">
              {t("history.title")}
            </h2>
            <p className="text-xs text-slate-500">{t("history.subtitle")}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-[11px]">
            <TabButton
              active={tab === "favorites"}
              onClick={() => setTab("favorites")}
              icon={<Star className="h-3 w-3" />}
              label={`${t("history.tabFavorites")} (${favorites.length})`}
            />
            <TabButton
              active={tab === "recent"}
              onClick={() => setTab("recent")}
              icon={<Clock className="h-3 w-3" />}
              label={`${t("history.tabRecent")} (${recent.length})`}
            />
          </div>
          {recent.length > 0 ? (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-slate-400 hover:border-risk-critical/40 hover:text-risk-critical"
            >
              <Trash2 className="h-3 w-3" />
              {t("history.clearAll")}
            </button>
          ) : null}
        </div>

        <div className="mt-3 max-h-[60vh] space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
          {items.length === 0 ? (
            <p className="px-1 py-3 text-sm text-slate-500">
              {tab === "favorites"
                ? t("history.emptyFavorites")
                : t("history.emptyRecent")}
            </p>
          ) : (
            items.map((entry) => (
              <Row
                key={`${entry.owner}/${entry.repo}`}
                entry={entry}
                onPick={() => handlePick(entry)}
                onStar={() => handleStar(entry)}
                onRemove={() => handleRemove(entry)}
                favoriteLabel={t("history.favorite")}
                unfavoriteLabel={t("history.unfavorite")}
                removeLabel={t("history.remove")}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition ${
        active
          ? "bg-gradient-to-br from-aurora-violet/30 to-aurora-blue/20 text-white ring-1 ring-aurora-violet/40"
          : "text-slate-400 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function gradeTone(grade: string | null): string {
  if (!grade) return "text-slate-400";
  if (/Excellent|Very Strong/.test(grade)) return "text-aurora-mint";
  if (/^Strong/.test(grade)) return "text-aurora-cyan";
  if (/Good/.test(grade)) return "text-aurora-violet";
  if (/Risky/.test(grade)) return "text-risk-medium";
  return "text-risk-critical";
}

function Row({
  entry,
  onPick,
  onStar,
  onRemove,
  favoriteLabel,
  unfavoriteLabel,
  removeLabel,
}: {
  entry: HistoryEntry;
  onPick: () => void;
  onStar: () => void;
  onRemove: () => void;
  favoriteLabel: string;
  unfavoriteLabel: string;
  removeLabel: string;
}) {
  return (
    <div className="group flex items-center gap-2 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-2 transition hover:border-white/10 hover:bg-white/[0.04]">
      <button
        type="button"
        onClick={onStar}
        aria-label={entry.favorite ? unfavoriteLabel : favoriteLabel}
        title={entry.favorite ? unfavoriteLabel : favoriteLabel}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition ${
          entry.favorite
            ? "border-aurora-mint/40 bg-aurora-mint/10 text-aurora-mint hover:bg-aurora-mint/20"
            : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
        }`}
      >
        <Star
          className={`h-3.5 w-3.5 ${entry.favorite ? "fill-current" : ""}`}
        />
      </button>
      <button
        type="button"
        onClick={onPick}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-md border border-white/10 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-7 w-7 shrink-0 rounded-md border border-white/10 bg-white/[0.03]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {entry.fullName}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            {entry.score !== null ? `${entry.score}/100` : "—"}{" "}
            {entry.grade ? (
              <span className={gradeTone(entry.grade)}>· {entry.grade}</span>
            ) : null}{" "}
            <span className="text-slate-600">
              · {formatRelative(entry.lastAuditedAt)}
            </span>
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        // Phase 5.2:
        //   - p-1 + h-3.5 was 22×22 px hit area (under WCAG 2.5.8's
        //     24×24 floor). Bumped to p-1.5 + h-4 = 28×28.
        //   - `opacity-0 group-hover:opacity-100` made the button
        //     literally invisible to non-hovering users — keyboard
        //     users could Tab focus to it but only saw it via the
        //     `focus:opacity-100` recovery, which is jarring. Now
        //     it's always at 60 % opacity and fades to 100 % on
        //     hover/focus, so the affordance is always discoverable.
        className="shrink-0 rounded-md p-1.5 text-slate-500 opacity-60 transition group-hover:opacity-100 hover:bg-risk-critical/10 hover:text-risk-critical focus-visible:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
