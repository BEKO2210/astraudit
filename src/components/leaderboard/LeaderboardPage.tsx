/**
 * <LeaderboardPage /> — Roadmap M6.3.
 *
 * Lazy route mounted at `#/leaderboard`. Composes the M6.1 search
 * layer + the M6.2 batch orchestrator into the first user‑facing
 * leaderboard surface: filter bar → preflight estimate → batch
 * run → sortable table that fills in as each audit completes.
 *
 * Snapshot persistence (M6.4) + trend arrows (M6.5) land in
 * follow‑up slices; this page intentionally keeps everything
 * in‑memory so the wiring stays small and reviewable.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Play,
  Square,
  Trophy,
} from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import { loadRepoBundle } from "../../lib/github";
import { probeRateLimit } from "../../lib/github/githubClient";
import {
  collectTopRepos,
  type SearchHit,
} from "../../lib/leaderboard/searchRepos";
import {
  parseLeaderboardFilter,
  serialiseLeaderboardFilter,
} from "../../lib/leaderboard/parseFilter";
import {
  runBatchAudit,
  type BatchProgress,
  type BatchRow,
} from "../../lib/leaderboard/batchAudit";
import {
  loadLatestSnapshot,
  loadSnapshotHistory,
  saveSnapshot,
  type SnapshotRecord,
  type SnapshotRow,
} from "../../lib/leaderboard/snapshotStore";
import { computeTrends, type Trend } from "../../lib/leaderboard/trends";
import type {
  AuditResult,
  WorkerInputMessage,
  WorkerOutputMessage,
} from "../../types/audit";
import type { RulePackId } from "../../lib/audit/rulePacks/types";
import { formatNumber } from "../../lib/utils/formatNumber";
import { formatRelative } from "../../lib/utils/formatDate";

const GRADE_CLASS: Record<string, string> = {
  A: "text-aurora-mint border-aurora-mint/40",
  B: "text-aurora-cyan border-aurora-cyan/40",
  C: "text-aurora-amber border-aurora-amber/40",
  D: "text-risk-medium border-risk-medium/40",
  F: "text-risk-critical border-risk-critical/40",
};

function gradeClass(grade: string): string {
  return GRADE_CLASS[grade] ?? "text-slate-400 border-white/10";
}

interface LeaderboardPageProps {
  enabledPacks: readonly RulePackId[];
}

/** Promise wrapper around a single worker postMessage round‑trip. */
function runWorkerAudit(
  worker: Worker,
  message: WorkerInputMessage,
  signal?: AbortSignal,
): Promise<AuditResult> {
  return new Promise((resolve, reject) => {
    const id = message.id;
    const onMessage = (event: MessageEvent<WorkerOutputMessage>) => {
      const m = event.data;
      if (!m || m.id !== id) return;
      if (m.type === "result") {
        cleanup();
        resolve(m.result);
      } else if (m.type === "error") {
        cleanup();
        reject(new Error(m.message));
      }
      // `progress` messages are ignored — leaderboard surfaces
      // per-repo done/error, not per-step granularity.
    };
    const onAbort = () => {
      cleanup();
      const e = new Error("aborted");
      e.name = "AbortError";
      reject(e);
    };
    const cleanup = () => {
      worker.removeEventListener("message", onMessage);
      signal?.removeEventListener("abort", onAbort);
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    worker.addEventListener("message", onMessage);
    signal?.addEventListener("abort", onAbort);
    worker.postMessage(message);
  });
}

interface FormState {
  language: string;
  topic: string;
  minStars: string;
  limit: string;
}

const LIMIT_MIN = 5;
const LIMIT_MAX = 100;
const LIMIT_DEFAULT = 20;

function readForm(): FormState {
  if (typeof window === "undefined") {
    return { language: "", topic: "", minStars: "", limit: String(LIMIT_DEFAULT) };
  }
  const parsed = parseLeaderboardFilter(window.location.search);
  const limitParam = new URLSearchParams(window.location.search).get("limit");
  return {
    language: parsed.language ?? "",
    topic: parsed.topic ?? "",
    minStars: parsed.minStars != null ? String(parsed.minStars) : "",
    limit:
      limitParam && Number.isFinite(Number(limitParam))
        ? String(
            Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, Math.floor(Number(limitParam)))),
          )
        : String(LIMIT_DEFAULT),
  };
}

function syncFormToUrl(form: FormState): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const filter = {
    language: form.language.trim() || undefined,
    topic: form.topic.trim().toLowerCase() || undefined,
    minStars: form.minStars ? Number(form.minStars) : undefined,
  };
  const ser = serialiseLeaderboardFilter(filter);
  url.search = "";
  if (ser) {
    for (const [k, v] of new URLSearchParams(ser)) url.searchParams.set(k, v);
  }
  if (form.limit && form.limit !== String(LIMIT_DEFAULT)) {
    url.searchParams.set("limit", form.limit);
  }
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

export function LeaderboardPage({ enabledPacks }: LeaderboardPageProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(() => readForm());
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  // Roadmap M6.4 — restored snapshot rows so the page is not
  // empty on first visit. Cleared once a fresh batch starts so
  // the table doesn't double-render snapshot + live rows.
  const [snapshot, setSnapshot] = useState<SnapshotRecord | null>(null);
  // Roadmap M6.5 — second-to-last snapshot for trend computation
  // against the currently displayed rows.
  const [previousSnapshot, setPreviousSnapshot] =
    useState<SnapshotRecord | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Spin up a dedicated batch worker for this page so it stays
  // isolated from the main app's audit worker (which the user
  // might still be using for the current single audit). Disposed
  // on unmount.
  useEffect(() => {
    const w = new Worker(
      new URL("../../workers/audit.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = w;
    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  // Cancel any in-flight batch on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Restore the most recent snapshot for the current filter on
  // mount + every time the filter changes. Running batches keep
  // their own `rows` state — the snapshot only fills the table
  // when no batch has produced live rows yet.
  useEffect(() => {
    if (running) return;
    const filter = {
      language: form.language.trim() || undefined,
      topic: form.topic.trim().toLowerCase() || undefined,
      minStars: form.minStars ? Number(form.minStars) : undefined,
    };
    const snap = loadLatestSnapshot(filter);
    setSnapshot(snap);
    // The second-to-last snapshot, if any, becomes the baseline
    // for trend arrows on the snapshot rows we just restored.
    const history = loadSnapshotHistory(filter);
    setPreviousSnapshot(
      history.length >= 2 ? history[history.length - 2]! : null,
    );
  }, [form.language, form.topic, form.minStars, running]);

  const updateField = useCallback(
    (key: keyof FormState, value: string) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        syncFormToUrl(next);
        return next;
      });
    },
    [],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const start = useCallback(async () => {
    if (running) return;
    setNotice(null);
    setRows([]);
    setSnapshot(null);
    setProgress(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    try {
      const limit = Math.min(
        LIMIT_MAX,
        Math.max(LIMIT_MIN, Math.floor(Number(form.limit)) || LIMIT_DEFAULT),
      );
      const filter = {
        language: form.language.trim() || undefined,
        topic: form.topic.trim().toLowerCase() || undefined,
        minStars: form.minStars ? Number(form.minStars) : undefined,
      };
      const hits = await collectTopRepos(filter, limit, {
        signal: controller.signal,
      });
      const packs = [...enabledPacks];
      const worker = workerRef.current;
      if (!worker) throw new Error("worker not initialised");

      const auditOne = async (hit: SearchHit, signal?: AbortSignal) => {
        const bundle = await loadRepoBundle(
          { owner: hit.owner, repo: hit.name },
          { signal },
        );
        return runWorkerAudit(
          worker,
          {
            type: "audit",
            bundle,
            id: hit.fullName,
            enabledPacks: packs,
          },
          signal,
        );
      };

      const onProgress = (event: BatchProgress) => {
        if (event.kind === "audit-start" || event.kind === "audit-done" || event.kind === "audit-error") {
          setProgress({ done: event.index, total: event.total });
        }
        if (event.kind === "audit-done" || event.kind === "audit-error") {
          setRows((prev) => {
            const next = [...prev];
            if (event.kind === "audit-done") {
              next.push({ hit: event.hit, status: "ok", audit: event.audit });
            } else {
              next.push({ hit: event.hit, status: "error", error: event.reason });
            }
            return next;
          });
        }
        if (event.kind === "preflight" && event.willLikelyHitLimit) {
          setNotice(t("leaderboard.preflightLow"));
        }
        if (event.kind === "rate-limit-hit") {
          setNotice(t("leaderboard.rateLimitHit"));
        }
      };

      const batch = await runBatchAudit({
        hits,
        auditOne,
        signal: controller.signal,
        onProgress,
        probeRateLimit,
      });

      // Roadmap M6.4 — persist a compact snapshot of every ok row
      // so a return visit shows the table instantly. Aborted /
      // empty batches are skipped (snapshots would be misleading).
      const okSnapshotRows: SnapshotRow[] = batch.rows
        .filter((r): r is Extract<BatchRow, { status: "ok" }> => r.status === "ok")
        .map((r) => ({
          fullName: r.hit.fullName,
          owner: r.hit.owner,
          name: r.hit.name,
          htmlUrl: r.hit.htmlUrl,
          description: r.hit.description,
          stars: r.hit.stars,
          pushedAt: r.hit.pushedAt,
          totalScore: r.audit.totalScore,
          maxScore: r.audit.maxScore,
          grade: r.audit.grade,
        }));
      if (okSnapshotRows.length > 0 && !batch.stoppedEarly) {
        // Reload the history so `previousSnapshot` reflects what
        // was the latest *before* this save — that's our trend
        // baseline. Doing it via loadSnapshotHistory keeps the
        // truth on disk authoritative.
        const historyBefore = loadSnapshotHistory(filter);
        const saved = saveSnapshot(filter, okSnapshotRows);
        setSnapshot(saved);
        setPreviousSnapshot(
          historyBefore.length > 0
            ? historyBefore[historyBefore.length - 1]!
            : null,
        );
      }
    } finally {
      setRunning(false);
      setProgress(null);
      abortRef.current = null;
    }
  }, [running, form, enabledPacks, t]);

  const reset = useCallback(() => {
    setRows([]);
    setNotice(null);
  }, []);

  /** Sort live rows: ok first (by score desc), then errors at the bottom. */
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.status === "ok" && b.status === "ok") {
        return b.audit.totalScore - a.audit.totalScore;
      }
      if (a.status === "ok") return -1;
      if (b.status === "ok") return 1;
      return 0;
    });
  }, [rows]);

  /** Snapshot rows pre-sorted by score desc — restored when no
   *  live batch has produced rows yet. */
  const snapshotSortedRows = useMemo(() => {
    if (!snapshot) return [];
    return [...snapshot.rows].sort(
      (a, b) => (b.totalScore ?? -1) - (a.totalScore ?? -1),
    );
  }, [snapshot]);

  const usingSnapshot = rows.length === 0 && snapshotSortedRows.length > 0;
  const tableHasContent = sortedRows.length > 0 || usingSnapshot;

  /** Trend baseline: previous snapshot's rows, or empty when none. */
  const trends = useMemo(() => {
    if (!previousSnapshot) return new Map<string, Trend>();
    const latestInput =
      sortedRows.length > 0
        ? sortedRows.map((r) => ({
            fullName: r.hit.fullName,
            totalScore: r.status === "ok" ? r.audit.totalScore : null,
          }))
        : snapshotSortedRows.map((r) => ({
            fullName: r.fullName,
            totalScore: r.totalScore,
          }));
    const previousInput = previousSnapshot.rows.map((r) => ({
      fullName: r.fullName,
      totalScore: r.totalScore,
    }));
    return computeTrends(latestInput, previousInput);
  }, [sortedRows, snapshotSortedRows, previousSnapshot]);

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <Trophy className="h-5 w-5 text-aurora-amber" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">
              {t("leaderboard.heading")}
            </h1>
            <p className="text-xs text-slate-500">{t("leaderboard.intro")}</p>
          </div>
        </div>
        <a
          href="#/"
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300 hover:bg-white/[0.06]"
        >
          <ArrowLeft className="h-3 w-3" />
          Home
        </a>
      </header>

      <section className="glass mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <FilterField
          label={t("leaderboard.filterLanguage")}
          value={form.language}
          placeholder={t("leaderboard.filterLanguagePlaceholder")}
          onChange={(v) => updateField("language", v)}
        />
        <FilterField
          label={t("leaderboard.filterTopic")}
          value={form.topic}
          placeholder={t("leaderboard.filterTopicPlaceholder")}
          onChange={(v) => updateField("topic", v)}
        />
        <FilterField
          label={t("leaderboard.filterMinStars")}
          value={form.minStars}
          placeholder="1000"
          type="number"
          onChange={(v) => updateField("minStars", v)}
        />
        <FilterField
          label={t("leaderboard.filterLimit")}
          value={form.limit}
          placeholder={String(LIMIT_DEFAULT)}
          type="number"
          onChange={(v) => updateField("limit", v)}
        />
      </section>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {running ? (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-1.5 rounded-lg border border-risk-medium/40 bg-risk-medium/10 px-3 py-1.5 text-sm font-medium text-risk-medium"
          >
            <Square className="h-3.5 w-3.5" />
            {t("leaderboard.cancel")}
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-aurora-violet to-aurora-blue px-3 py-1.5 text-sm font-semibold text-white shadow-glow"
          >
            <Play className="h-3.5 w-3.5" />
            {t("leaderboard.start")}
          </button>
        )}
        {rows.length > 0 ? (
          <button
            type="button"
            onClick={reset}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-slate-300 hover:bg-white/[0.06] disabled:opacity-60"
          >
            {t("leaderboard.reset")}
          </button>
        ) : null}
        {progress ? (
          <span className="inline-flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3 w-3 motion-safe:animate-spin" />
            {t("leaderboard.progressLabel")} {progress.done + 1}/{progress.total}
          </span>
        ) : null}
      </div>

      {notice ? (
        <p
          role="status"
          className="mt-3 rounded-lg border border-aurora-amber/40 bg-aurora-amber/10 px-3 py-2 text-xs text-aurora-amber"
        >
          {notice}
        </p>
      ) : null}

      {!tableHasContent && !running ? (
        <p className="mt-6 text-sm text-slate-500">{t("leaderboard.emptyHint")}</p>
      ) : null}

      {usingSnapshot ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-400">
          {t("leaderboard.snapshotLabel")}{" "}
          {snapshot ? new Date(snapshot.savedAt).toLocaleString() : ""}
        </p>
      ) : null}

      {tableHasContent ? (
        <section className="glass mt-3 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-[10px] uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <Th>{t("leaderboard.tableRank")}</Th>
                  <Th>{t("leaderboard.tableRepo")}</Th>
                  <Th className="text-right">{t("leaderboard.tableScore")}</Th>
                  <Th>{t("leaderboard.tableTrend")}</Th>
                  <Th>{t("leaderboard.tableGrade")}</Th>
                  <Th className="text-right">{t("leaderboard.tableStars")}</Th>
                  <Th>{t("leaderboard.tableLastPushed")}</Th>
                  <Th className="text-right">{t("leaderboard.tableActions")}</Th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.length > 0
                  ? sortedRows.map((row, idx) => (
                      <Row
                        key={row.hit.fullName}
                        rank={idx + 1}
                        row={row}
                        trend={trends.get(row.hit.fullName) ?? null}
                        t={t}
                      />
                    ))
                  : snapshotSortedRows.map((row, idx) => (
                      <SnapshotRowView
                        key={row.fullName}
                        rank={idx + 1}
                        row={row}
                        trend={trends.get(row.fullName) ?? null}
                        t={t}
                      />
                    ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SnapshotRowView({
  rank,
  row,
  trend,
  t,
}: {
  rank: number;
  row: SnapshotRow;
  trend: Trend | null;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return (
    <tr className="border-t border-white/5 hover:bg-white/[0.02]">
      <td className="px-3 py-2 text-slate-400">{rank}</td>
      <td className="px-3 py-2">
        <a
          href={row.htmlUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-white hover:text-aurora-cyan"
        >
          {row.fullName}
        </a>
        {row.description ? (
          <div className="max-w-md truncate text-[11px] text-slate-500">
            {row.description}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-2 text-right font-mono">
        {row.totalScore != null && row.maxScore != null
          ? `${row.totalScore}/${row.maxScore}`
          : "—"}
      </td>
      <td className="px-3 py-2">
        <TrendCell trend={trend} t={t} />
      </td>
      <td className="px-3 py-2">
        {row.grade ? (
          <span className={`pill border ${gradeClass(row.grade)}`}>
            {row.grade}
          </span>
        ) : (
          <span className="pill text-risk-medium border-risk-medium/40">
            {t("leaderboard.errorRow")}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right font-mono text-slate-300">
        {formatNumber(row.stars)}
      </td>
      <td className="px-3 py-2 text-slate-400">{formatRelative(row.pushedAt)}</td>
      <td className="px-3 py-2 text-right">
        <a
          href={`#/audit/${row.fullName}`}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-aurora-cyan hover:bg-white/[0.06]"
        >
          {t("leaderboard.openAudit")}
          <ExternalLink className="h-3 w-3" />
        </a>
      </td>
    </tr>
  );
}

function FilterField({
  label,
  value,
  placeholder,
  type,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: "text" | "number";
  onChange: (next: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <input
        type={type ?? "text"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora-violet/60"
        inputMode={type === "number" ? "numeric" : undefined}
      />
    </label>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2 text-left font-medium ${className ?? ""}`}>{children}</th>
  );
}

/**
 * Roadmap M6.5 — per-row trend pill. Empty cell when no previous
 * snapshot exists (so the first leaderboard run isn't visually
 * cluttered with "new" badges on every row).
 */
function TrendCell({
  trend,
  t,
}: {
  trend: Trend | null;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (!trend) return <span className="text-slate-600">—</span>;
  if (trend.direction === "new") {
    return (
      <span className="pill text-aurora-cyan border-aurora-cyan/40">
        {t("leaderboard.trendNew")}
      </span>
    );
  }
  if (trend.direction === "dropped") {
    return (
      <span className="pill text-slate-500 border-white/10">
        {t("leaderboard.trendDropped")}
      </span>
    );
  }
  if (trend.delta == null || trend.direction === "same") {
    return <span className="text-slate-500">→</span>;
  }
  const isUp = trend.direction === "up";
  const arrow = isUp ? "↑" : "↓";
  const tone = isUp ? "text-aurora-mint" : "text-risk-medium";
  const sign = isUp ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs ${tone}`}>
      <span aria-hidden="true">{arrow}</span>
      {sign}
      {trend.delta}
    </span>
  );
}

function Row({
  rank,
  row,
  trend,
  t,
}: {
  rank: number;
  row: BatchRow;
  trend: Trend | null;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const hit = row.hit;
  return (
    <tr className="border-t border-white/5 hover:bg-white/[0.02]">
      <td className="px-3 py-2 text-slate-400">{rank}</td>
      <td className="px-3 py-2">
        <a
          href={hit.htmlUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-white hover:text-aurora-cyan"
        >
          {hit.fullName}
        </a>
        {hit.description ? (
          <div className="max-w-md truncate text-[11px] text-slate-500">
            {hit.description}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-2 text-right font-mono">
        {row.status === "ok" ? `${row.audit.totalScore}/${row.audit.maxScore}` : "—"}
      </td>
      <td className="px-3 py-2">
        <TrendCell trend={trend} t={t} />
      </td>
      <td className="px-3 py-2">
        {row.status === "ok" ? (
          <span className={`pill border ${gradeClass(row.audit.grade)}`}>
            {row.audit.grade}
          </span>
        ) : (
          <span className="pill text-risk-medium border-risk-medium/40">
            {t("leaderboard.errorRow")}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right font-mono text-slate-300">
        {formatNumber(hit.stars)}
      </td>
      <td className="px-3 py-2 text-slate-400">{formatRelative(hit.pushedAt)}</td>
      <td className="px-3 py-2 text-right">
        <a
          href={`#/audit/${hit.fullName}`}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-aurora-cyan hover:bg-white/[0.06]"
        >
          {t("leaderboard.openAudit")}
          <ExternalLink className="h-3 w-3" />
        </a>
      </td>
    </tr>
  );
}
