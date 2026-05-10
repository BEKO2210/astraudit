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

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
if (TOKEN) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("api.github.com") || url.includes("raw.githubusercontent.com")) {
      const headers = new Headers(init.headers ?? {});
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${TOKEN}`);
      }
      return originalFetch(input, { ...init, headers });
    }
    return originalFetch(input, init);
  }) as typeof fetch;
  console.log("Using GITHUB_TOKEN for authenticated requests.\n");
}

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`Astraudit local test — ${REPOS.length} repositories\n`);
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
    await sleep(1500);
  }

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
    console.log(`• ${r.repo}`);
    console.log(`    Stars: ${r.stars}`);
    console.log(`    Strongest: ${r.topCategory}`);
    console.log(`    Weakest:   ${r.weakest}`);
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
