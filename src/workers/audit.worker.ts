/// <reference lib="webworker" />
import { progressFor, runAudit } from "../lib/audit/auditEngine";
import type { WorkerInputMessage, WorkerOutputMessage } from "../types/audit";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener("message", (event: MessageEvent<WorkerInputMessage>) => {
  const message = event.data;
  if (!message || message.type !== "audit") return;
  try {
    const result = runAudit(message.bundle, (step) => {
      const out: WorkerOutputMessage = {
        type: "progress",
        progress: progressFor(step),
      };
      ctx.postMessage(out);
    });
    const out: WorkerOutputMessage = { type: "result", result };
    ctx.postMessage(out);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Audit worker failed unexpectedly.";
    const out: WorkerOutputMessage = { type: "error", message };
    ctx.postMessage(out);
  }
});
