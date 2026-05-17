import { describe, expect, it, vi } from "vitest";
import {
  runBatchAudit,
  type BatchProgress,
} from "../../../src/lib/leaderboard/batchAudit";
import { RateLimitError } from "../../../src/lib/github/githubClient";
import type { SearchHit } from "../../../src/lib/leaderboard/searchRepos";
import type { AuditResult } from "../../../src/types/audit";

function makeHit(idx: number, overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    fullName: `owner/repo-${idx}`,
    owner: "owner",
    name: `repo-${idx}`,
    htmlUrl: `https://github.com/owner/repo-${idx}`,
    description: null,
    stars: 1000 - idx,
    language: "TypeScript",
    topics: [],
    archived: false,
    defaultBranch: "main",
    pushedAt: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

function fakeAudit(hit: SearchHit): AuditResult {
  // Minimal valid-enough AuditResult shape — only the fields
  // the batch surfaces back to its caller matter here.
  return {
    bundle: { metadata: { fullName: hit.fullName } } as never,
    totalScore: 80,
    maxScore: 100,
    grade: "B",
    verdict: "",
    headline: "",
    categories: [],
    findings: [],
    story: [],
    graph: { nodes: [], edges: [] } as never,
    stack: {} as never,
    fileStructure: {} as never,
    recommendations: [],
    insights: {} as never,
    onboarding: [],
    generatedAt: "2026-05-17T00:00:00Z",
    enabledPacks: [],
  };
}

describe("runBatchAudit (M6.2)", () => {
  it("audits every hit sequentially and resolves with ok rows", async () => {
    const hits = [makeHit(0), makeHit(1), makeHit(2)];
    const auditOne = vi.fn(async (hit: SearchHit) => fakeAudit(hit));
    const events: BatchProgress[] = [];
    const result = await runBatchAudit({
      hits,
      auditOne,
      onProgress: (e) => events.push(e),
    });
    expect(result.rows).toHaveLength(3);
    expect(result.rows.every((r) => r.status === "ok")).toBe(true);
    expect(result.stoppedEarly).toBe(false);
    // Sequential — every call started before the next.
    expect(auditOne.mock.invocationCallOrder).toEqual(
      [...auditOne.mock.invocationCallOrder].sort((a, b) => a - b),
    );
    // Last event is `complete`.
    expect(events.at(-1)?.kind).toBe("complete");
  });

  it("emits audit-start + audit-done events with the correct index/total", async () => {
    const hits = [makeHit(0), makeHit(1)];
    const events: BatchProgress[] = [];
    await runBatchAudit({
      hits,
      auditOne: async (h) => fakeAudit(h),
      onProgress: (e) => events.push(e),
    });
    const starts = events.filter((e) => e.kind === "audit-start");
    const dones = events.filter((e) => e.kind === "audit-done");
    expect(starts).toHaveLength(2);
    expect(dones).toHaveLength(2);
    expect((starts[0] as { index: number }).index).toBe(0);
    expect((starts[1] as { index: number }).index).toBe(1);
    expect((starts[0] as { total: number }).total).toBe(2);
  });

  it("continues after a per‑audit unknown failure (one bad repo doesn't kill the batch)", async () => {
    const hits = [makeHit(0), makeHit(1), makeHit(2)];
    const auditOne = vi.fn(async (h: SearchHit) => {
      if (h.fullName.endsWith("-1")) throw new Error("boom");
      return fakeAudit(h);
    });
    const result = await runBatchAudit({ hits, auditOne });
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]?.status).toBe("ok");
    expect(result.rows[1]?.status).toBe("error");
    if (result.rows[1]?.status === "error") {
      expect(result.rows[1].error.kind).toBe("unknown");
    }
    expect(result.rows[2]?.status).toBe("ok");
    expect(result.stoppedEarly).toBe(false);
  });

  it("stops short on a RateLimitError + records the reset timestamp", async () => {
    const hits = [makeHit(0), makeHit(1), makeHit(2)];
    const auditOne = vi.fn(async (h: SearchHit) => {
      if (h.fullName.endsWith("-1")) {
        throw new RateLimitError({
          resetAtSeconds: 1_790_000_000,
          unauthenticated: true,
        });
      }
      return fakeAudit(h);
    });
    const events: BatchProgress[] = [];
    const result = await runBatchAudit({
      hits,
      auditOne,
      onProgress: (e) => events.push(e),
    });
    expect(result.rows).toHaveLength(2);
    expect(result.stoppedEarly).toBe(true);
    expect(result.stopReason?.kind).toBe("rate-limit");
    expect(auditOne).toHaveBeenCalledTimes(2);
    expect(events.some((e) => e.kind === "rate-limit-hit")).toBe(true);
  });

  it("respects an already-aborted signal and short‑circuits before the first audit", async () => {
    const controller = new AbortController();
    controller.abort();
    const auditOne = vi.fn();
    const result = await runBatchAudit({
      hits: [makeHit(0)],
      auditOne,
      signal: controller.signal,
    });
    expect(auditOne).not.toHaveBeenCalled();
    expect(result.stoppedEarly).toBe(true);
    expect(result.stopReason?.kind).toBe("aborted");
  });

  it("stops mid‑batch when the AbortSignal fires between audits", async () => {
    const hits = [makeHit(0), makeHit(1), makeHit(2)];
    const controller = new AbortController();
    const auditOne = vi.fn(async (h: SearchHit) => {
      if (h.fullName.endsWith("-0")) {
        controller.abort();
      }
      return fakeAudit(h);
    });
    const result = await runBatchAudit({
      hits,
      auditOne,
      signal: controller.signal,
    });
    expect(result.rows.length).toBeLessThan(3);
    expect(result.stoppedEarly).toBe(true);
    expect(result.stopReason?.kind).toBe("aborted");
  });

  it("treats an inner AbortError throw as an abort", async () => {
    const hits = [makeHit(0), makeHit(1)];
    const auditOne = vi.fn(async () => {
      const e = new Error("aborted");
      e.name = "AbortError";
      throw e;
    });
    const result = await runBatchAudit({ hits, auditOne });
    expect(result.stoppedEarly).toBe(true);
    expect(result.stopReason?.kind).toBe("aborted");
  });

  it("emits a preflight event with `willLikelyHitLimit` when remaining < estimated cost", async () => {
    const hits = Array.from({ length: 10 }, (_, i) => makeHit(i));
    const events: BatchProgress[] = [];
    await runBatchAudit({
      hits,
      auditOne: async (h) => fakeAudit(h),
      probeRateLimit: async () => ({
        remaining: 50,
        limit: 60,
        resetSeconds: 600,
        authenticated: false,
      }),
      requestsPerAudit: 12,
      onProgress: (e) => events.push(e),
    });
    const preflight = events.find((e) => e.kind === "preflight");
    expect(preflight).toBeDefined();
    expect((preflight as { willLikelyHitLimit: boolean }).willLikelyHitLimit).toBe(
      true,
    );
  });

  it("preflight willLikelyHitLimit is false when budget covers estimate", async () => {
    const hits = Array.from({ length: 5 }, (_, i) => makeHit(i));
    const events: BatchProgress[] = [];
    await runBatchAudit({
      hits,
      auditOne: async (h) => fakeAudit(h),
      probeRateLimit: async () => ({
        remaining: 4500,
        limit: 5000,
        resetSeconds: 3600,
        authenticated: true,
      }),
      onProgress: (e) => events.push(e),
    });
    const preflight = events.find((e) => e.kind === "preflight") as {
      willLikelyHitLimit: boolean;
    };
    expect(preflight.willLikelyHitLimit).toBe(false);
  });

  it("does not crash when probeRateLimit rejects", async () => {
    const hits = [makeHit(0)];
    const result = await runBatchAudit({
      hits,
      auditOne: async (h) => fakeAudit(h),
      probeRateLimit: async () => {
        throw new Error("probe failed");
      },
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.status).toBe("ok");
  });

  it("does not crash when the progress handler throws", async () => {
    const result = await runBatchAudit({
      hits: [makeHit(0), makeHit(1)],
      auditOne: async (h) => fakeAudit(h),
      onProgress: () => {
        throw new Error("handler exploded");
      },
    });
    expect(result.rows).toHaveLength(2);
  });
});
