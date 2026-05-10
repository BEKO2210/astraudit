#!/usr/bin/env node
/**
 * Astraudit MCP server — Phase 6 / 101% release-readiness.
 *
 * Lets any MCP-compatible AI client (Claude Desktop, Cursor, Zed,
 * VS Code AI, Continue, etc.) run an Astraudit audit on a public
 * GitHub repo and get back the curated, schema-versioned JSON
 * result.
 *
 * Constraint check:
 *   ✅ Browser-only — the SPA at beko2210.github.io/astraudit remains
 *      the primary surface. This server runs **on the user's own
 *      machine** when their AI client spawns it. We host no
 *      infrastructure; the engine still hits api.github.com /
 *      raw.githubusercontent.com directly.
 *   ✅ Free forever — npm publish is free; the server costs nothing
 *      to run.
 *   ✅ Public repos only — the engine accepts only public-repo
 *      coordinates, same as the SPA.
 *   ✅ Rule-based — this server is a transport. Findings remain
 *      output of the existing rule-based detectors in
 *      `src/lib/audit/`. We do **not** call any LLM here.
 *
 * Wiring:
 *   AI client → stdio JSON-RPC → McpServer → audit_repo tool
 *     → loadRepoBundle() (existing) → runAudit() (existing)
 *     → exportToJson() (existing, versioned schema)
 *
 * Run locally:
 *   npm run mcp            # tsx, dev-time
 *   node dist-bin/mcp-server.js   # after `npm run build:bin`
 *   npx astraudit-mcp      # after `npm publish` lands the package
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { loadRepoBundle } from "../src/lib/github/index.js";
import { runAudit } from "../src/lib/audit/auditEngine.js";
import { exportToJson } from "../src/lib/export/auditExport.js";
import { mapAuditError } from "../src/lib/github/auditErrorView.js";

/* -------------------------------------------------------------------------- */
/* The single tool                                                            */
/* -------------------------------------------------------------------------- */

const auditInputSchema = {
  owner: z
    .string()
    .min(1)
    .describe(
      "GitHub owner or organisation (the `facebook` in `facebook/react`).",
    ),
  repo: z
    .string()
    .min(1)
    .describe(
      "GitHub repository name (the `react` in `facebook/react`).",
    ),
  token: z
    .string()
    .optional()
    .describe(
      "Optional fine-grained GitHub PAT with `public_repo` read scope. " +
        "Falls back to GITHUB_TOKEN / GH_TOKEN env vars. " +
        "Without a token the audit shares the 60 req/h unauthenticated " +
        "rate-limit pool — fine for occasional use, hit the limit fast " +
        "during a back-and-forth session.",
    ),
};

interface AuditInput {
  owner: string;
  repo: string;
  token?: string;
}

/**
 * The actual handler. Pulled out so it's unit-testable without
 * standing up the full McpServer.
 */
export async function handleAuditRepo(args: AuditInput): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const { owner, repo, token } = args;
  try {
    const bundle = await loadRepoBundle({ owner, repo }, { token });
    const result = runAudit(bundle);
    const payload = exportToJson(result);
    return {
      content: [
        {
          type: "text",
          text: payload,
        },
      ],
    };
  } catch (err) {
    const view = mapAuditError(err);
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: view.kind,
              title: view.title,
              message: view.message,
              ...(view.resetAtSeconds != null
                ? { rateLimitResetAtSeconds: view.resetAtSeconds }
                : {}),
              ...(view.unauthenticated != null
                ? { unauthenticated: view.unauthenticated }
                : {}),
            },
            null,
            2,
          ),
        },
      ],
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Server bootstrap                                                           */
/* -------------------------------------------------------------------------- */

export function buildServer(): McpServer {
  const server = new McpServer(
    {
      name: "astraudit",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.registerTool(
    "audit_repo",
    {
      title: "Audit a public GitHub repository",
      description:
        "Run Astraudit's rule-based audit against a public GitHub " +
        "repository. Returns the full categorised JSON: a 0-100 readiness " +
        "score across eight categories (Documentation, Structure, Code " +
        "Quality, Security & Trust, Maintenance, Developer Experience, " +
        "Ecosystem, CI/CD), every detector hit with severity + " +
        "recommendation, a plain-language repository story, and a " +
        "prioritised next-steps list. No backend, no AI inference — every " +
        "finding comes from a rule-based detector documented at " +
        "https://beko2210.github.io/astraudit/#/rules.",
      inputSchema: auditInputSchema,
    },
    async (args) => handleAuditRepo(args as AuditInput),
  );

  return server;
}

async function main(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stdio servers stay alive until the client disconnects.
}

// Only run when invoked directly (not when imported by the unit test).
const isDirectInvocation =
  typeof process !== "undefined" &&
  typeof process.argv?.[1] === "string" &&
  /mcp-server\.(?:js|ts|mjs|cjs)$/.test(process.argv[1] ?? "");

if (isDirectInvocation) {
  main().catch((err) => {
    // We write the failure to stderr so MCP clients can surface it
    // in their inspector log. Process exit forces the client to
    // notice the crash and reconnect.
    // eslint-disable-next-line no-console
    console.error("[astraudit-mcp] fatal:", err);
    process.exit(1);
  });
}
