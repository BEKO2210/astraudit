import { useCallback, useEffect, useRef, useState } from "react";
import { Hero } from "./components/Hero";
import { RepoInput } from "./components/RepoInput";
import { ExampleRepos } from "./components/ExampleRepos";
import { EmptyState } from "./components/EmptyState";
import { LoadingAudit } from "./components/LoadingAudit";
import { ErrorState } from "./components/ErrorState";
import { ReviewDashboard } from "./components/ReviewDashboard";
import { Footer } from "./components/Footer";
import { parseRepoInput } from "./lib/github/parseRepoInput";
import {
  GithubError,
  NotFoundError,
  RateLimitError,
  loadRepoBundle,
} from "./lib/github";
import type {
  AuditProgressStep,
  AuditResult,
  WorkerOutputMessage,
} from "./types/audit";
import type { RepoBundle } from "./types/github";

type AppState =
  | { kind: "idle" }
  | { kind: "fetching"; repoLabel: string; step: AuditProgressStep }
  | { kind: "auditing"; repoLabel: string; step: AuditProgressStep }
  | { kind: "ready"; result: AuditResult }
  | { kind: "error"; title: string; message: string };

export default function App() {
  const [input, setInput] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [state, setState] = useState<AppState>({ kind: "idle" });
  const workerRef = useRef<Worker | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("./workers/audit.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.addEventListener("message", (event: MessageEvent<WorkerOutputMessage>) => {
      const message = event.data;
      if (!message) return;
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
          title: "Audit failed",
          message: message.message,
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
    async (rawInput: string) => {
      const parsed = parseRepoInput(rawInput);
      if (!parsed.ok || !parsed.coords) {
        setValidationError(parsed.error ?? "Invalid input.");
        return;
      }
      setValidationError(null);
      setInput(`${parsed.coords.owner}/${parsed.coords.repo}`);

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const repoLabel = `${parsed.coords.owner}/${parsed.coords.repo}`;
      setState({ kind: "fetching", repoLabel, step: "metadata" });

      let bundle: RepoBundle;
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
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (err instanceof RateLimitError) {
          setState({
            kind: "error",
            title: "Rate limited",
            message: err.message,
          });
          return;
        }
        if (err instanceof NotFoundError) {
          setState({
            kind: "error",
            title: "Repository not found",
            message: err.message,
          });
          return;
        }
        if (err instanceof GithubError) {
          setState({
            kind: "error",
            title: "GitHub error",
            message: err.message,
          });
          return;
        }
        setState({
          kind: "error",
          title: "Network error",
          message: (err as Error).message ?? "Unknown failure.",
        });
        return;
      }

      if (bundle.tree.entries.length === 0) {
        setState({
          kind: "error",
          title: "Empty repository",
          message: "No analyzable files found.",
        });
        return;
      }

      setState({ kind: "auditing", repoLabel, step: "metadata" });
      const worker = workerRef.current;
      if (!worker) {
        setState({
          kind: "error",
          title: "Worker not ready",
          message: "Audit worker is not available in this environment.",
        });
        return;
      }
      worker.postMessage({ type: "audit", bundle });
    },
    [],
  );

  const handleReset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setState({ kind: "idle" });
    setValidationError(null);
  }, []);

  const showLoading = state.kind === "fetching" || state.kind === "auditing";

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
      <Hero />

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
          step={(state as { step: AuditProgressStep }).step}
          repoLabel={(state as { repoLabel: string }).repoLabel}
        />
      ) : null}

      {state.kind === "error" ? (
        <ErrorState
          title={state.title}
          message={state.message}
          onReset={handleReset}
        />
      ) : null}

      {state.kind === "ready" ? <ReviewDashboard result={state.result} /> : null}

      <Footer />
    </div>
  );
}
