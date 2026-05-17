/// <reference lib="webworker" />
import { progressFor, runAudit } from "../lib/audit/auditEngine";
import { RULE_PACK_IDS, type RulePackId } from "../lib/audit/rulePacks/types";
import type { WorkerInputMessage, WorkerOutputMessage } from "../types/audit";

const KNOWN_PACKS: ReadonlySet<string> = new Set(RULE_PACK_IDS);

function sanitizePacks(raw: string[] | undefined): Set<RulePackId> {
  if (!raw || raw.length === 0) return new Set();
  const out = new Set<RulePackId>();
  for (const id of raw) {
    if (typeof id === "string" && KNOWN_PACKS.has(id)) {
      out.add(id as RulePackId);
    }
  }
  return out;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

// Phase 7.x — CodeQL's `js/missing-origin-check` rule was firing
// on this handler. The rule is meant for
// `window.addEventListener("message", ...)` on cross-origin pages,
// where any other window can postMessage in. This is a
// DedicatedWorkerGlobalScope: by spec, the ONLY sender is the page
// that called `new Worker(...)` (Astraudit's own SPA at the same
// origin, locked further by the strict CSP in index.html). There is
// no cross-origin sender to authenticate.
//
// The previous `lgtm[]` comment was a LGTM.com pragma that
// GitHub-Advanced-Security ignores. The right pattern is to
// nevertheless emit an explicit origin guard that the data-flow
// analyzer recognizes — the check is a no-op at runtime (a worker
// MessageEvent on a DedicatedWorkerGlobalScope has an empty origin
// string by spec) but it makes the safety property machine-checkable.
ctx.addEventListener("message", (event: MessageEvent<WorkerInputMessage>) => {
  // Origin verification: in a DedicatedWorkerGlobalScope, `event.origin`
  // is the empty string when the message comes from the spawning page
  // (same-origin by spec). Any other value would indicate a Worker
  // re-parented to a different context — which the platform does not
  // permit today, but if a future browser bug surfaced one we'd want
  // to drop it. Reject anything we don't recognise.
  if (event.origin !== "" && event.origin !== self.location.origin) {
    return;
  }
  const message = event.data;
  if (!message || message.type !== "audit") return;
  const id = message.id;
  try {
    const enabledPacks = sanitizePacks(message.enabledPacks);
    const result = runAudit(
      message.bundle,
      (step) => {
        const out: WorkerOutputMessage = {
          type: "progress",
          progress: progressFor(step),
          id,
        };
        ctx.postMessage(out);
      },
      { enabledPacks },
    );
    const out: WorkerOutputMessage = { type: "result", result, id };
    ctx.postMessage(out);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Audit worker failed unexpectedly.";
    const out: WorkerOutputMessage = { type: "error", message, id };
    ctx.postMessage(out);
  }
});
