/// <reference lib="webworker" />
import { progressFor, runAudit } from "../lib/audit/auditEngine";
import type { WorkerInputMessage, WorkerOutputMessage } from "../types/audit";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener("message", (event: MessageEvent<WorkerInputMessage>) => {
  const message = event.data;
  if (!message || message.type !== "audit") return;
  const id = message.id;
  try {
    const result = runAudit(message.bundle, (step) => {
      const out: WorkerOutputMessage = {
        type: "progress",
        progress: progressFor(step),
        id,
      };
      ctx.postMessage(out);
    });
    const out: WorkerOutputMessage = { type: "result", result, id };
    ctx.postMessage(out);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Audit worker failed unexpectedly.";
    const out: WorkerOutputMessage = { type: "error", message, id };
    ctx.postMessage(out);
  }
});
