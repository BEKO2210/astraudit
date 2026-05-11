/// <reference lib="webworker" />
import { progressFor, runAudit } from "../lib/audit/auditEngine";
import type { WorkerInputMessage, WorkerOutputMessage } from "../types/audit";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

// CodeQL fires `js/missing-origin-check` on this handler. The rule
// is meant for `window.addEventListener("message", ...)` on
// cross-origin pages, where any other window can postMessage in.
// This is a DedicatedWorkerGlobalScope — by spec, the only sender
// is the page that called `new Worker(...)` (Astraudit's own SPA at
// the same origin, gated by the strict CSP in index.html). There is
// no cross-origin sender to verify; the rule does not apply.
// lgtm[js/missing-origin-check]
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
