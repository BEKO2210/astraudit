import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Hero } from "./components/Hero";
import { RepoInput } from "./components/RepoInput";
import { ExampleRepos } from "./components/ExampleRepos";
import { EmptyState } from "./components/EmptyState";
import { LoadingAudit } from "./components/LoadingAudit";
import { ErrorState } from "./components/ErrorState";
import { ReviewDashboard } from "./components/ReviewDashboard";
import { Footer } from "./components/Footer";
import { SettingsDialog } from "./components/SettingsDialog";
import { CompareDialog } from "./components/CompareDialog";
import { HistoryDialog } from "./components/HistoryDialog";
// Roadmap M4.1 UI slice — lazy so the discovery dialog doesn't
// inflate the main chunk; it's only mounted after the user clicks
// "Find similar repos" on a ready audit.
const StackMatesDialog = lazy(() =>
  import("./components/StackMatesDialog").then((m) => ({
    default: m.StackMatesDialog,
  })),
);
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { ToastHost } from "./components/ToastHost";
import { PanelSkeleton } from "./components/ui/PanelSkeleton";

// Phase 6.16 — lazy-load surfaces that aren't on the first-paint path:
// CompareDashboard (only when in compare mode), CommandPalette (Cmd+K
// modal), and the three legal pages (route-only). Each becomes its own
// chunk so the initial bundle drops by ~70 KB. Phase 6.4 wires the
// content-shaped routes to <PanelSkeleton /> fallbacks so the chunk
// fetch doesn't leave a blank viewport. Modals stay on `null` because
// the user just clicked something — they expect the modal to appear,
// not a skeleton in the page below it.
const CompareDashboard = lazy(() =>
  import("./components/CompareDashboard").then((m) => ({
    default: m.CompareDashboard,
  })),
);
const CommandPalette = lazy(() =>
  import("./components/CommandPalette").then((m) => ({
    default: m.CommandPalette,
  })),
);
const Impressum = lazy(() =>
  import("./components/legal/Impressum").then((m) => ({ default: m.Impressum })),
);
const Datenschutzerklaerung = lazy(() =>
  import("./components/legal/Datenschutzerklaerung").then((m) => ({
    default: m.Datenschutzerklaerung,
  })),
);
const RuleBook = lazy(() =>
  import("./components/legal/RuleBook").then((m) => ({ default: m.RuleBook })),
);
// Phase 7.0.8 — `/scope/` route. Documents what Astraudit does +
// doesn't check, in answer to the Reddit feedback that the tool
// produced confident-sounding output outside its real surface area.
const ScopePage = lazy(() =>
  import("./components/legal/ScopePage").then((m) => ({ default: m.ScopePage })),
);
// Roadmap M3.6 — bookmarklet page at `#/bookmarklet`. Fallback for
// browsers without the M3.2–M3.4 extension installed.
const BookmarkletPage = lazy(() =>
  import("./components/legal/BookmarkletPage").then((m) => ({
    default: m.BookmarkletPage,
  })),
);
import { readBundle, removeBundle, writeBundle } from "./lib/cache/auditCache";
import { applyDensity, loadDensity } from "./lib/density/densityStore";
import { recordAudit } from "./lib/history/historyStore";
import { buildCommands } from "./lib/commands/buildCommands";
import { useGlobalShortcuts } from "./lib/keyboard/useGlobalShortcuts";
import {
  applyAuditHash,
  applyCompareHash,
  clearAuditHash,
  parseShareHash,
} from "./lib/share/urlState";
import { parseRepoInput } from "./lib/github/parseRepoInput";
import { loadRepoBundle } from "./lib/github";
import { useTranslation } from "./lib/i18n";
import {
  readEnabledPacks,
  serialiseEnabledPacks,
} from "./lib/audit/rulePacks/parseRules";
import type { RulePackId } from "./lib/audit/rulePacks/types";
import {
  emptyRepoView,
  mapAuditError,
  type AuditErrorView,
} from "./lib/github/auditErrorView";
import { buildCompareResult, type CompareResult } from "./lib/compare/diff";
import type {
  AuditProgressStep,
  AuditResult,
  WorkerOutputMessage,
} from "./types/audit";
import type { RepoBundle, RepoCoordinates } from "./types/github";

type CompareSide = "left" | "right";

/** Map a hash fragment to one of the doc-page slugs (or null). */
function routeFromHash(
  hash: string,
): "impressum" | "datenschutz" | "rules" | "scope" | "bookmarklet" | null {
  // Strip leading `#/` AND any trailing slash so `#/scope`,
  // `#/scope/`, and `#scope/` all resolve identically. Codex flagged
  // that the documented `/scope/` shape was not handled (#78 review).
  const normalized = hash
    .replace(/^#\/?/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
  if (normalized === "impressum") return "impressum";
  if (normalized === "datenschutz" || normalized === "datenschutzerklaerung") {
    return "datenschutz";
  }
  // Phase 4.5 — public rule book at `#/rules` (also accept `#/rule-book`
  // and `#/rulebook` so anyone guessing the URL still lands).
  if (
    normalized === "rules" ||
    normalized === "rulebook" ||
    normalized === "rule-book"
  ) {
    return "rules";
  }
  // Phase 7.0.8 — explicit scope page documenting what Astraudit
  // does + doesn't check. Linked from the footer + every error
  // state + the Security panel's "what's not covered" callout.
  // Accept `scope`, `limits`, and `whats-not-checked` so guessable
  // URLs all land here.
  if (
    normalized === "scope" ||
    normalized === "limits" ||
    normalized === "whats-not-checked"
  ) {
    return "scope";
  }
  // Roadmap M3.6 — public bookmarklet page. Accept `bookmarklet`
  // and the shorthand `pin` so links from the extension store
  // listing or social posts both resolve here.
  if (normalized === "bookmarklet" || normalized === "pin") {
    return "bookmarklet";
  }
  return null;
}

type AppState =
  | { kind: "idle" }
  | { kind: "fetching"; repoLabel: string; step: AuditProgressStep }
  | { kind: "auditing"; repoLabel: string; step: AuditProgressStep }
  | { kind: "ready"; result: AuditResult }
  | {
      kind: "comparing";
      labelLeft: string;
      labelRight: string;
      step: AuditProgressStep;
    }
  | { kind: "compared"; compare: CompareResult }
  | { kind: "error"; view: AuditErrorView; lastInput?: string };

export default function App() {
  const { t } = useTranslation();
  const [input, setInput] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [state, setState] = useState<AppState>({ kind: "idle" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [stackMatesOpen, setStackMatesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [authTick, setAuthTick] = useState(0);
  const [historyTick, setHistoryTick] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Roadmap M5.1 / M5.5 — opt‑in rule packs. Seeded from the URL
  // on mount (URL is the canonical source of truth) and mutated
  // by the Settings dialog's toggles. Held in state so the
  // SettingsDialog re-renders on toggle; held in a ref mirror so
  // the worker postMessage call sites don't re-read state on
  // every audit kickoff.
  const [enabledPacks, setEnabledPacks] = useState<readonly RulePackId[]>(
    () => Array.from(readEnabledPacks()) as RulePackId[],
  );
  const enabledPacksRef = useRef<readonly string[]>(enabledPacks);
  useEffect(() => {
    enabledPacksRef.current = enabledPacks;
  }, [enabledPacks]);

  /**
   * Replace the active rule packs. Updates state, mirrors the
   * value into the worker-message ref, and rewrites `?rules=` in
   * the URL via `history.replaceState` so the canonical share
   * link stays in sync (URL flag remains the source of truth).
   */
  const updateEnabledPacks = useCallback((next: readonly RulePackId[]) => {
    setEnabledPacks(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const serialised = serialiseEnabledPacks(new Set(next));
    if (serialised) {
      url.searchParams.set("rules", serialised);
    } else {
      url.searchParams.delete("rules");
    }
    const newHref = url.pathname + url.search + url.hash;
    window.history.replaceState(window.history.state, "", newHref);
  }, []);
  const compareJobRef = useRef<{
    left?: AuditResult;
    right?: AuditResult;
  } | null>(null);

  // Bootstrap density on first paint — needs to run before the user
  // ever opens Settings, otherwise compact mode wouldn't apply on
  // refresh. Theme follows the same pattern (in ThemeToggle's effect),
  // but density has no toggle in the header so we wire it here.
  useEffect(() => {
    applyDensity(loadDensity());
  }, []);

  // Routing for the German legal pages. We keep this as a tiny
  // hash-based router rather than touching the existing audit/compare
  // hash logic — the legal hashes are independent and never overlap.
  const [legalRoute, setLegalRoute] = useState<
    "impressum" | "datenschutz" | "rules" | "scope" | "bookmarklet" | null
  >(() => routeFromHash(typeof window !== "undefined" ? window.location.hash : ""));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setLegalRoute(routeFromHash(window.location.hash));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  useEffect(() => {
    const worker = new Worker(
      new URL("./workers/audit.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.addEventListener("message", (event: MessageEvent<WorkerOutputMessage>) => {
      const message = event.data;
      if (!message) return;

      // Compare-mode results: collect both sides, then assemble.
      if (
        message.type === "result" &&
        (message.id === "left" || message.id === "right") &&
        compareJobRef.current
      ) {
        compareJobRef.current[message.id as CompareSide] = message.result;
        const job = compareJobRef.current;
        if (job.left && job.right) {
          const compare = buildCompareResult(job.left, job.right);
          compareJobRef.current = null;
          setState({ kind: "compared", compare });
        }
        return;
      }
      if (
        message.type === "error" &&
        (message.id === "left" || message.id === "right") &&
        compareJobRef.current
      ) {
        compareJobRef.current = null;
        setState({
          kind: "error",
          view: {
            kind: "unknown",
            title: t("app.compareFailed"),
            message: message.message,
            actions: [{ kind: "reset", label: t("app.tryDifferentRepo") }],
          },
        });
        return;
      }
      if (
        message.type === "progress" &&
        (message.id === "left" || message.id === "right")
      ) {
        setState((prev) =>
          prev.kind === "comparing"
            ? { ...prev, step: message.progress.step }
            : prev,
        );
        return;
      }

      // Single-audit path.
      if (message.type === "progress") {
        setState((prev) =>
          prev.kind === "auditing"
            ? { ...prev, step: message.progress.step }
            : prev,
        );
      } else if (message.type === "result") {
        setState({ kind: "ready", result: message.result });
      } else if (message.type === "error") {
        setState({
          kind: "error",
          view: {
            kind: "unknown",
            title: t("app.auditFailed"),
            message: message.message,
            actions: [{ kind: "reset", label: t("app.tryDifferentRepo") }],
          },
        });
      }
    });
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const startAudit = useCallback(
    async (
      rawInput: string,
      options: { fromHash?: boolean; forceFresh?: boolean } = {},
    ) => {
      const parsed = parseRepoInput(rawInput);
      if (!parsed.ok || !parsed.coords) {
        setValidationError(parsed.error ?? t("app.invalidInput"));
        return;
      }
      setValidationError(null);
      setInput(`${parsed.coords.owner}/${parsed.coords.repo}`);

      // Sync the URL hash so the audit is shareable. push=true on a
      // user-initiated submit so the back button reverts to the prior
      // view; replace on a hash-driven kickoff to avoid duplicate
      // history entries.
      applyAuditHash(parsed.coords, { push: !options.fromHash });

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const repoLabel = `${parsed.coords.owner}/${parsed.coords.repo}`;
      setState({ kind: "fetching", repoLabel, step: "metadata" });

      // forceFresh: caller wants a brand-new fetch (e.g. user clicked
      // "Re-audit" because a deploy went out and the cached bundle is
      // 12h stale). Drop the cached entry first so the fetch path
      // doesn't fall back into the early-return below.
      if (options.forceFresh) {
        removeBundle(parsed.coords);
      }
      let bundle: RepoBundle | null = options.forceFresh
        ? null
        : readBundle(parsed.coords);
      if (bundle) {
        // Cache hit — skip the network entirely. Move straight to auditing.
        setState({ kind: "auditing", repoLabel, step: "metadata" });
        const worker = workerRef.current;
        if (worker) {
          worker.postMessage({
            type: "audit",
            bundle,
            enabledPacks: [...enabledPacksRef.current],
          });
          return;
        }
      }

      try {
        bundle = await loadRepoBundle(parsed.coords, {
          signal: controller.signal,
          onProgress: (key) => {
            const map: Record<string, AuditProgressStep> = {
              metadata: "metadata",
              tree: "tree",
              languages: "stack",
              readme: "documentation",
              files: "stack",
              workflows: "quality",
              commits: "quality",
              releases: "quality",
              issues: "quality",
            };
            const step = map[key] ?? "metadata";
            setState({ kind: "fetching", repoLabel, step });
          },
        });
        writeBundle(parsed.coords, bundle);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState({ kind: "error", view: mapAuditError(err), lastInput: rawInput });
        return;
      }

      if (bundle.tree.entries.length === 0) {
        setState({ kind: "error", view: emptyRepoView(), lastInput: rawInput });
        return;
      }

      setState({ kind: "auditing", repoLabel, step: "metadata" });
      const worker = workerRef.current;
      if (!worker) {
        setState({
          kind: "error",
          view: {
            kind: "unknown",
            title: t("app.workerNotReady"),
            message: t("app.workerNotReadyMsg"),
            actions: [{ kind: "retry", label: t("app.retry") }],
          },
          lastInput: rawInput,
        });
        return;
      }
      worker.postMessage({
        type: "audit",
        bundle,
        enabledPacks: [...enabledPacksRef.current],
      });
    },
    [],
  );

  const handleReset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    compareJobRef.current = null;
    setState({ kind: "idle" });
    setValidationError(null);
    clearAuditHash({ push: true });
  }, []);

  /**
   * Fetch a single bundle (cache-aware). Returns the bundle on
   * success or a structured AuditErrorView on failure so the
   * compare-mode caller can hand the same view shape to ErrorState
   * that the main flow uses. Phase 5.6: was previously emitting a
   * loose `{ title, message }` shape that drifted from the main
   * path's mapping.
   */
  const loadBundleFor = useCallback(
    async (
      coords: RepoCoordinates,
      signal: AbortSignal,
    ): Promise<RepoBundle | { error: AuditErrorView }> => {
      const cached = readBundle(coords);
      if (cached) return cached;
      try {
        const bundle = await loadRepoBundle(coords, { signal });
        writeBundle(coords, bundle);
        return bundle;
      } catch (err) {
        return { error: mapAuditError(err) };
      }
    },
    [],
  );

  /**
   * Audit two repos and produce a CompareResult.
   *
   * Bundles are fetched in parallel (each one is sequential within the
   * GitHub API client). The two bundles are then sent to the worker in
   * sequence with id="left" and id="right"; the worker callback above
   * collects both AuditResults and assembles the diff.
   */
  const startCompare = useCallback(
    async (
      a: RepoCoordinates,
      b: RepoCoordinates,
      options: { fromHash?: boolean } = {},
    ) => {
      if (
        a.owner.toLowerCase() === b.owner.toLowerCase() &&
        a.repo.toLowerCase() === b.repo.toLowerCase()
      ) {
        setValidationError(t("app.pickDifferent"));
        return;
      }
      setValidationError(null);

      applyCompareHash(a, b, { push: !options.fromHash });

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      compareJobRef.current = {};

      const labelLeft = `${a.owner}/${a.repo}`;
      const labelRight = `${b.owner}/${b.repo}`;
      setState({
        kind: "comparing",
        labelLeft,
        labelRight,
        step: "metadata",
      });

      const [leftBundle, rightBundle] = await Promise.all([
        loadBundleFor(a, controller.signal),
        loadBundleFor(b, controller.signal),
      ]);

      const errBundle = "error" in leftBundle ? leftBundle : "error" in rightBundle ? rightBundle : null;
      if (errBundle && "error" in errBundle) {
        compareJobRef.current = null;
        setState({ kind: "error", view: errBundle.error });
        return;
      }
      if ("error" in leftBundle || "error" in rightBundle) return;

      const worker = workerRef.current;
      if (!worker) {
        setState({
          kind: "error",
          view: {
            kind: "unknown",
            title: t("app.workerNotReady"),
            message: t("app.workerNotReadyCompareMsg"),
            actions: [{ kind: "retry", label: t("app.retry") }],
          },
        });
        return;
      }
      const packs = [...enabledPacksRef.current];
      worker.postMessage({
        type: "audit",
        bundle: leftBundle,
        id: "left",
        enabledPacks: packs,
      });
      worker.postMessage({
        type: "audit",
        bundle: rightBundle,
        id: "right",
        enabledPacks: packs,
      });
    },
    [loadBundleFor],
  );

  /** Open the compare dialog from anywhere. */
  const openCompare = useCallback(() => setCompareOpen(true), []);
  const openStackMates = useCallback(() => setStackMatesOpen(true), []);

  /** Submit handler from the dialog: kick off a compare given the right side. */
  const submitCompareWith = useCallback(
    (rawRight: string) => {
      const parsedRight = parseRepoInput(rawRight);
      if (!parsedRight.ok || !parsedRight.coords) {
        setValidationError(parsedRight.error ?? t("app.invalidInput"));
        return;
      }
      let leftCoords: RepoCoordinates | null = null;
      if (state.kind === "ready") {
        leftCoords = {
          owner: state.result.bundle.metadata.owner.login,
          repo: state.result.bundle.metadata.name,
        };
      } else if (state.kind === "compared") {
        leftCoords = {
          owner: state.compare.left.bundle.metadata.owner.login,
          repo: state.compare.left.bundle.metadata.name,
        };
      }
      if (!leftCoords) {
        setValidationError(t("app.runSingleFirst"));
        return;
      }
      setCompareOpen(false);
      void startCompare(leftCoords, parsedRight.coords);
    },
    [state, startCompare],
  );

  // On first mount, honour any audit/compare hash already in the URL —
  // this is the entire reason shared links work as deep links.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial = parseShareHash(window.location.hash);
    if (!initial) return;
    if (initial.kind === "audit") {
      void startAudit(`${initial.coords.owner}/${initial.coords.repo}`, {
        fromHash: true,
      });
    } else if (initial.kind === "compare") {
      void startCompare(initial.left, initial.right, { fromHash: true });
    }
    // We intentionally only do this once at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back / forward navigation: re-derive the audit/compare (or reset)
  // from the hash. We compare against the currently-shown state to
  // avoid kicking off the same job twice.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      const parsed = parseShareHash(window.location.hash);
      if (!parsed) {
        if (abortRef.current) abortRef.current.abort();
        compareJobRef.current = null;
        setState({ kind: "idle" });
        setValidationError(null);
        return;
      }
      if (parsed.kind === "audit") {
        const currentLabel =
          state.kind === "fetching" || state.kind === "auditing"
            ? state.repoLabel
            : state.kind === "ready"
              ? state.result.bundle.metadata.fullName
              : "";
        const targetLabel = `${parsed.coords.owner}/${parsed.coords.repo}`;
        if (currentLabel.toLowerCase() === targetLabel.toLowerCase()) return;
        void startAudit(targetLabel, { fromHash: true });
      } else if (parsed.kind === "compare") {
        const currentPair =
          state.kind === "comparing"
            ? `${state.labelLeft}+${state.labelRight}`.toLowerCase()
            : state.kind === "compared"
              ? `${state.compare.left.bundle.metadata.fullName}+${state.compare.right.bundle.metadata.fullName}`.toLowerCase()
              : "";
        const target = `${parsed.left.owner}/${parsed.left.repo}+${parsed.right.owner}/${parsed.right.repo}`.toLowerCase();
        if (currentPair === target) return;
        void startCompare(parsed.left, parsed.right, { fromHash: true });
      }
    };
    window.addEventListener("popstate", handler);
    window.addEventListener("hashchange", handler);
    return () => {
      window.removeEventListener("popstate", handler);
      window.removeEventListener("hashchange", handler);
    };
  }, [state, startAudit, startCompare]);

  // When an audit (single or compare) finishes successfully, persist it
  // to the local history. Compare mode records both sides.
  useEffect(() => {
    if (state.kind === "ready") {
      const m = state.result.bundle.metadata;
      recordAudit({
        coords: { owner: m.owner.login, repo: m.name },
        fullName: m.fullName,
        avatarUrl: m.owner.avatarUrl,
        score: state.result.totalScore,
        grade: state.result.grade,
      });
      setHistoryTick((t) => t + 1);
    } else if (state.kind === "compared") {
      const ml = state.compare.left.bundle.metadata;
      const mr = state.compare.right.bundle.metadata;
      recordAudit({
        coords: { owner: ml.owner.login, repo: ml.name },
        fullName: ml.fullName,
        avatarUrl: ml.owner.avatarUrl,
        score: state.compare.left.totalScore,
        grade: state.compare.left.grade,
      });
      recordAudit({
        coords: { owner: mr.owner.login, repo: mr.name },
        fullName: mr.fullName,
        avatarUrl: mr.owner.avatarUrl,
        score: state.compare.right.totalScore,
        grade: state.compare.right.grade,
      });
      setHistoryTick((t) => t + 1);
    }
  }, [state]);

  // Roadmap M4.4 — deep-link to a specific finding via
  // `#/audit/owner/repo?focus=<id>`. Fires when the audit becomes
  // ready and the URL hash carries a focus token; scrolls the
  // matching FindingCard into view and toggles a 2.5s highlight
  // ring so the user sees what was linked. The data-attribute
  // hook stays out of React state to avoid extra renders.
  useEffect(() => {
    if (state.kind !== "ready") return;
    if (typeof window === "undefined") return;
    const parsed = parseShareHash(window.location.hash);
    if (!parsed || parsed.kind !== "audit" || !parsed.focus) return;
    // Wait one frame so the finding cards are mounted before we
    // querySelector for them.
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(`finding-${parsed.focus}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.dataset.astrauditFocus = "true";
      const t = window.setTimeout(() => {
        delete el.dataset.astrauditFocus;
      }, 2500);
      return () => window.clearTimeout(t);
    });
    return () => cancelAnimationFrame(raf);
  }, [state.kind]);

  // Smooth-scroll to a section by its anchor id, identical to the
  // SectionNav click handler — re-implemented here so global keyboard
  // shortcuts work even when the SectionNav is unmounted.
  const jumpTo = useCallback((sectionId: string) => {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    const el = document.getElementById(sectionId);
    if (!el) return;
    const offset = 90;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  // Compose the palette commands fresh on every render so they always
  // reflect the latest history / favorites / current state.
  const commands = buildCommands({
    hasAudit: state.kind === "ready",
    hasCompare: state.kind === "compared",
    jumpTo,
    startAudit: (raw) => void startAudit(raw),
    openCompare,
    openSettings: () => setSettingsOpen(true),
    openHistory: () => setHistoryOpen(true),
    resetToHome: handleReset,
  });

  useGlobalShortcuts({
    onPalette: () => setPaletteOpen((v) => !v),
    onJump: jumpTo,
    onCheatSheet: () => setShortcutsOpen(true),
    onFocusInput: () => {
      const el = document.querySelector<HTMLInputElement>(
        "input[data-astraudit-repo-input]",
      );
      el?.focus();
    },
  });

  const showLoading =
    state.kind === "fetching" ||
    state.kind === "auditing" ||
    state.kind === "comparing";

  // Legal pages take precedence over the audit UI. We render them as a
  // stand-alone view so the user can read them undistracted and so deep
  // links work. The audit state is preserved in memory but unmounted
  // visually — clicking "Zurück zur App" returns to it intact.
  if (legalRoute === "impressum") {
    return (
      <Suspense fallback={null}>
        <Impressum />
      </Suspense>
    );
  }
  if (legalRoute === "datenschutz") {
    return (
      <Suspense fallback={null}>
        <Datenschutzerklaerung />
      </Suspense>
    );
  }
  if (legalRoute === "rules") {
    return (
      <Suspense fallback={<PanelSkeleton label={t("skeleton.loadingRuleBook")} rows={8} />}>
        <RuleBook />
      </Suspense>
    );
  }
  if (legalRoute === "scope") {
    return (
      <Suspense fallback={<PanelSkeleton label={t("skeleton.loadingScope")} rows={8} />}>
        <ScopePage />
      </Suspense>
    );
  }
  if (legalRoute === "bookmarklet") {
    return (
      <Suspense
        fallback={<PanelSkeleton label={t("skeleton.loadingBookmarklet")} rows={6} />}
      >
        <BookmarkletPage />
      </Suspense>
    );
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
      <Hero
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        authTick={authTick}
        historyTick={historyTick}
      />

      {/* Phase 6.9 — single <main> landmark so SR users can jump to
          the audit surface with their landmark-nav shortcut. Hero
          renders the page banner (<header>) above; Footer renders
          the contentinfo landmark below. */}
      <main id="main" className="flex flex-col">
      <RepoInput
        onSubmit={startAudit}
        loading={showLoading}
        initialValue={input}
        error={validationError}
      />

      {state.kind === "idle" ? (
        <>
          <ExampleRepos onPick={startAudit} disabled={showLoading} />
          <EmptyState />
        </>
      ) : null}

      {showLoading ? (
        <LoadingAudit
          step={
            state.kind === "comparing"
              ? state.step
              : (state as { step: AuditProgressStep }).step
          }
          repoLabel={
            state.kind === "comparing"
              ? `${state.labelLeft}  vs.  ${state.labelRight}`
              : (state as { repoLabel: string }).repoLabel
          }
        />
      ) : null}

      {state.kind === "error" ? (
        <ErrorState
          view={state.view}
          onReset={handleReset}
          onRetry={
            state.lastInput
              ? () => {
                  // Retry replays the last submitted raw input through
                  // the same parse + audit path. Cache may still hold
                  // a fresh bundle for the parsed coords (avoiding the
                  // network round-trip that just failed); when it
                  // doesn't, the user gets one more chance — and any
                  // recovered rate-limit will succeed this time.
                  const last = state.lastInput;
                  if (last) void startAudit(last);
                }
              : undefined
          }
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : null}

      {state.kind === "ready" ? (
        <ReviewDashboard
          result={state.result}
          onOpenCompare={openCompare}
          onOpenStackMates={openStackMates}
          onReaudit={() => {
            const r = state.result;
            void startAudit(
              `${r.bundle.metadata.owner.login}/${r.bundle.metadata.name}`,
              { forceFresh: true },
            );
          }}
        />
      ) : null}

      {state.kind === "compared" ? (
        <Suspense
          fallback={<PanelSkeleton label={t("skeleton.loadingCompare")} rows={6} />}
        >
          <CompareDashboard
            compare={state.compare}
            onReset={handleReset}
            onOpenCompare={openCompare}
          />
        </Suspense>
      ) : null}
      </main>

      <Footer />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          setAuthTick((t) => t + 1);
        }}
        enabledPacks={enabledPacks}
        onChangeEnabledPacks={updateEnabledPacks}
      />

      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onPick={(fullName) => {
          void startAudit(fullName);
        }}
        tick={historyTick}
      />

      {paletteOpen ? (
        <Suspense fallback={null}>
          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            commands={commands}
          />
        </Suspense>
      ) : null}

      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <ToastHost />

      <CompareDialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        onSubmit={submitCompareWith}
        leftLabel={
          state.kind === "ready"
            ? state.result.bundle.metadata.fullName
            : state.kind === "compared"
              ? state.compare.left.bundle.metadata.fullName
              : ""
        }
      />

      <Suspense fallback={null}>
        <StackMatesDialog
          open={stackMatesOpen}
          onClose={() => setStackMatesOpen(false)}
          base={
            state.kind === "ready"
              ? {
                  fullName: state.result.bundle.metadata.fullName,
                  language: state.result.bundle.metadata.language,
                  topics: state.result.bundle.metadata.topics,
                  stars: state.result.bundle.metadata.stars,
                }
              : null
          }
        />
      </Suspense>
    </div>
  );
}
