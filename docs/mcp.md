# Use Astraudit from your AI

Astraudit ships an **MCP server** that lets any AI client with MCP support — Claude Desktop, Cursor, Zed, VS Code Copilot/AI, Continue.dev, and any other tool that speaks the [Model Context Protocol](https://modelcontextprotocol.io/) — run a real audit on a public GitHub repository and read back the full categorised JSON.

The server runs **on your own machine**. Your AI client spawns it over stdio when needed. Astraudit hosts no infrastructure; the audit hits `api.github.com` and `raw.githubusercontent.com` directly — exactly the same path the browser dashboard uses. Your GitHub PAT (if you supply one) never leaves your computer.

---

## Install once

The package isn't on npm yet (planned for v1.0 — see Phase 6.49 in ROADMAP.md). Until then, install from the repo:

```bash
git clone https://github.com/BEKO2210/astraudit.git
cd astraudit
npm install
npm run build:bin   # → dist-bin/mcp-server.js
```

Once `astraudit-mcp` is published, the install becomes a one-liner:

```bash
npx -y astraudit-mcp
```

---

## Configure your AI client

### Claude Desktop (macOS / Windows)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, or `%APPDATA%\Claude\claude_desktop_config.json` on Windows:

```jsonc
{
  "mcpServers": {
    "astraudit": {
      "command": "node",
      "args": ["/absolute/path/to/astraudit/dist-bin/mcp-server.js"],
      "env": {
        // Optional. Without a token the audit shares the 60 req/h
        // unauthenticated rate-limit pool — fine for a few audits a day.
        "GITHUB_TOKEN": "github_pat_..."
      }
    }
  }
}
```

After publishing, the config simplifies to:

```jsonc
{
  "mcpServers": {
    "astraudit": {
      "command": "npx",
      "args": ["-y", "astraudit-mcp"]
    }
  }
}
```

Restart Claude Desktop. The `audit_repo` tool will be available under the wrench icon next to the prompt input.

### Cursor

Open **Settings → Cursor Settings → MCP**, click **+ Add new MCP server**, fill in:

| Field | Value |
| --- | --- |
| Name | `astraudit` |
| Command | `node` |
| Args | `["/absolute/path/to/astraudit/dist-bin/mcp-server.js"]` |
| Environment | `GITHUB_TOKEN=...` (optional) |

### Zed

Add to `~/.config/zed/settings.json`:

```jsonc
{
  "context_servers": {
    "astraudit": {
      "command": {
        "path": "node",
        "args": ["/absolute/path/to/astraudit/dist-bin/mcp-server.js"]
      }
    }
  }
}
```

### VS Code (Copilot Agents / Continue)

Each extension has its own MCP config UI; the underlying invocation is the same — point it at `node /absolute/path/to/astraudit/dist-bin/mcp-server.js`.

---

## What the AI can do

The server exposes one tool:

```jsonc
{
  "name": "audit_repo",
  "description": "Run Astraudit's rule-based audit against a public GitHub repository...",
  "inputSchema": {
    "type": "object",
    "required": ["owner", "repo"],
    "properties": {
      "owner": { "type": "string" },
      "repo":  { "type": "string" },
      "token": { "type": "string" }
    }
  }
}
```

The AI calls it with the repo coordinates and gets back the full `AuditResult` JSON — same versioned schema the dashboard's "Export → JSON" button emits:

```jsonc
{
  "schema": "astraudit-audit-export",
  "schemaVersion": "1",
  "generatedAt": "2026-05-10T19:55:10.000Z",
  "repository": { "fullName": "...", "stars": 232109, ... },
  "score": { "total": 87, "max": 100, "grade": "Very Strong", "verdict": "..." },
  "categories": [
    { "key": "documentation", "label": "Documentation", "score": 15, "max": 15, "status": "strong", "evidence": [...] },
    // ... 7 more categories
  ],
  "findings":        [/* every detector hit with severity + recommendation */],
  "recommendations": [/* prioritised next steps */],
  "onboarding":      [/* inferred setup steps */],
  "story":           [/* plain-language repo story */],
  "stack":           {/* runtime / package manager / frameworks */}
}
```

---

## Example prompts

> "Audit `facebook/react` with Astraudit and tell me the top three things they should fix."

> "Use Astraudit to compare `expressjs/express` and `koajs/koa` — which has the stronger security posture?"

> "Run an Astraudit pass on `vitejs/vite`, then summarise the categories where it scored below 80%."

The AI will call the `audit_repo` tool transparently and have the full JSON in its context for the response.

---

## Troubleshooting

### Rate limit reached (60 req/h)

The unauthenticated pool is shared across your IP. Either:

1. Pass a token in the tool call: the AI prompt becomes "audit `owner/repo` with token `github_pat_...`" — the AI threads the value into the tool args.
2. Set `GITHUB_TOKEN` in the MCP server's `env` block (Claude Desktop config above). Use a fine-grained PAT with the `public_repo` read scope. Astraudit only ever sends it to `api.github.com` / `raw.githubusercontent.com`.

### "Repository not found"

Astraudit only audits **public** repositories. Private-repo support is in the [anti-roadmap](../ROADMAP.md) and won't change — that would require server-held secrets, breaking the project's core constraint.

### The AI doesn't see the tool

1. Confirm the absolute path in the config is correct (`ls -la /absolute/path/to/astraudit/dist-bin/mcp-server.js`).
2. Confirm Node 20+ is the default `node` on your PATH (`node --version`).
3. Restart the AI client after editing the config.
4. Check the client's MCP / tools inspector log — Claude Desktop has one under `~/Library/Logs/Claude/mcp.log` on macOS.

### Verify the server works without an AI

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist-bin/mcp-server.js
```

You should see a JSON response describing the `audit_repo` tool. If you see an error or nothing at all, the build didn't complete — re-run `npm run build:bin`.

---

## What this server doesn't do

- **No private repos.** GitHub's API returns 404 to unauthenticated requests for them; Astraudit's engine handles that as a clean error.
- **No code execution.** Astraudit reads metadata + a small set of well-known config files; it never `git clone`s, `npm install`s, or executes anything from the audited repo.
- **No AI inference.** All findings are output of the rule-based detectors documented at https://beko2210.github.io/astraudit/#/rules. This server is a transport.
- **No telemetry.** The server doesn't phone home. The only outbound requests are to GitHub's public API.

These boundaries are documented in detail in [`ROADMAP.md` → Anti-roadmap](../ROADMAP.md).
