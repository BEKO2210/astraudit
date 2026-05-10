import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

import { loadRepoBundle, GithubError, NotFoundError, RateLimitError } from "../src/lib/github/index";
import { runAudit } from "../src/lib/audit/auditEngine";
import { parseRepoInput } from "../src/lib/github/parseRepoInput";

const REPOS = [
  "facebook/react",
  "vuejs/core",
  "expressjs/express",
  "lodash/lodash",
  "vitejs/vite",
  "microsoft/TypeScript",
  "denoland/deno",
  "sveltejs/svelte",
  "prettier/prettier",
  "nodejs/node",
];

const CACHE_DIR = join(process.cwd(), ".audit-cache");
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

const cacheKey = (url: string, accept: string): string => {
  return createHash("sha1").update(`${accept}::${url}`).digest("hex");
};

const cachePath = (key: string) => join(CACHE_DIR, `${key}.json`);

interface CachedResponse {
  status: number;
  ok: boolean;
  body: string;
  headers: Record<string, string>;
}

function readCache(url: string, accept: string): CachedResponse | null {
  const p = cachePath(cacheKey(url, accept));
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as CachedResponse;
  } catch {
    return null;
  }
}

function writeCache(
  url: string,
  accept: string,
  resp: CachedResponse,
): void {
  const p = cachePath(cacheKey(url, accept));
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(resp), "utf8");
}

const originalFetch = globalThis.fetch;
let cacheHits = 0;
let cacheMisses = 0;

globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input.toString();
  const githubUrl =
    url.includes("api.github.com") || url.includes("raw.githubusercontent.com");
  const headers = new Headers(init.headers ?? {});
  const accept = headers.get("Accept") ?? "default";

  if (githubUrl) {
    const cached = readCache(url, accept);
    if (cached) {
      cacheHits += 1;
      return new Response(cached.body, {
        status: cached.status,
        headers: cached.headers,
      });
    }
    cacheMisses += 1;
    if (TOKEN && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${TOKEN}`);
    }
    if (!headers.has("User-Agent")) {
      headers.set("User-Agent", "astraudit-tester/1.0");
    }
  }

  const response = await originalFetch(input, { ...init, headers });

  if (githubUrl && response.ok) {
    const headerObj: Record<string, string> = {};
    response.headers.forEach((v, k) => (headerObj[k] = v));
    const cloned = response.clone();
    const body = await cloned.text();
    writeCache(url, accept, {
      status: response.status,
      ok: response.ok,
      body,
      headers: headerObj,
    });
  }

  return response;
}) as typeof fetch;

interface Row {
  repo: string;
  ok: boolean;
  score?: number;
  max?: number;
  grade?: string;
  findings?: number;
  critical?: number;
  high?: number;
  language?: string | null;
  stars?: number;
  topCategory?: string;
  weakest?: string;
  durationMs?: number;
  error?: string;
  recommendations?: string[];
  story?: string;
}

const PAD = (s: string, len: number) =>
  s.length >= len ? s.slice(0, len - 1) + "…" : s.padEnd(len, " ");

async function auditOne(input: string): Promise<Row> {
  const start = Date.now();
  const parsed = parseRepoInput(input);
  if (!parsed.ok || !parsed.coords) {
    return { repo: input, ok: false, error: parsed.error ?? "parse failure" };
  }
  try {
    const bundle = await loadRepoBundle(parsed.coords);
    const result = runAudit(bundle);
    const counts = result.findings.reduce<Record<string, number>>(
      (acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] ?? 0) + 1 }),
      {},
    );
    const sorted = [...result.categories].sort(
      (a, b) => b.score / b.max - a.score / a.max,
    );
    const top = sorted[0];
    const weakest = sorted[sorted.length - 1];
    const projectStory = result.story.find((s) =>
      s.heading.includes("appears to be"),
    );
    return {
      repo: bundle.metadata.fullName,
      ok: true,
      score: result.totalScore,
      max: result.maxScore,
      grade: result.grade,
      findings: result.findings.length,
      critical: counts.critical ?? 0,
      high: counts.high ?? 0,
      language: bundle.metadata.language,
      stars: bundle.metadata.stars,
      topCategory: `${top.label} (${top.score}/${top.max})`,
      weakest: `${weakest.label} (${weakest.score}/${weakest.max})`,
      durationMs: Date.now() - start,
      recommendations: result.recommendations.slice(0, 3).map((r) => r.title),
      story: projectStory?.body,
    };
  } catch (err) {
    let msg = "Unknown error";
    if (err instanceof RateLimitError) msg = "RATE LIMIT";
    else if (err instanceof NotFoundError) msg = "NOT FOUND";
    else if (err instanceof GithubError) msg = `GH ${err.status}`;
    else if (err instanceof Error) msg = err.message;
    return { repo: input, ok: false, error: msg, durationMs: Date.now() - start };
  }
}

async function main() {
  if (TOKEN) console.log("Using GITHUB_TOKEN for authenticated requests.\n");
  console.log(`Astraudit local test — ${REPOS.length} repositories`);
  console.log(`Cache dir: ${CACHE_DIR}\n`);
  const rows: Row[] = [];
  for (const repo of REPOS) {
    process.stdout.write(`Auditing ${repo}... `);
    const row = await auditOne(repo);
    rows.push(row);
    if (row.ok) {
      console.log(
        `${row.score}/${row.max} (${row.grade}) · ${row.findings} findings · ${row.durationMs}ms`,
      );
    } else {
      console.log(`FAILED — ${row.error}`);
    }
  }

  console.log(`\nCache: ${cacheHits} hits, ${cacheMisses} misses`);

  console.log("\n=========================== AUDIT REPORT ===========================");
  console.log(
    PAD("Repository", 26) +
      PAD("Score", 10) +
      PAD("Grade", 22) +
      PAD("Findings", 10) +
      PAD("Crit/High", 12) +
      PAD("Language", 14),
  );
  console.log("-".repeat(94));
  for (const r of rows) {
    if (!r.ok) {
      console.log(PAD(r.repo, 26) + "ERROR  " + r.error);
      continue;
    }
    console.log(
      PAD(r.repo, 26) +
        PAD(`${r.score}/${r.max}`, 10) +
        PAD(r.grade ?? "", 22) +
        PAD(String(r.findings), 10) +
        PAD(`${r.critical}/${r.high}`, 12) +
        PAD(r.language ?? "—", 14),
    );
  }
  console.log("-".repeat(94));

  console.log("\nPer-repo highlights:");
  for (const r of rows) {
    if (!r.ok) continue;
    console.log(`\n• ${r.repo}  ⭐ ${r.stars}`);
    if (r.story) console.log(`    Story: ${r.story}`);
    console.log(`    Strongest: ${r.topCategory}`);
    console.log(`    Weakest:   ${r.weakest}`);
    if (r.recommendations) {
      console.log(`    Top fixes:`);
      for (const rec of r.recommendations) console.log(`      - ${rec}`);
    }
  }

  const ok = rows.filter((r) => r.ok);
  if (ok.length > 0) {
    const avg =
      ok.reduce((sum, r) => sum + (r.score ?? 0), 0) / ok.length;
    console.log(
      `\nSummary: ${ok.length}/${rows.length} succeeded · average score ${avg.toFixed(1)}/100`,
    );
  } else {
    console.log("\nNo successful audits.");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(2);
});
