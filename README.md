# Astraudit

Understand any public GitHub repository before you trust it.

Astraudit maps, scores, and explains public GitHub repositories — **entirely in
the browser**, with no backend, no login, no tokens, and no execution of any
third-party code.

> Browser-only static analysis. No code execution. No secrets. Public
> repositories only.

## What is Astraudit?

Astraudit is a static, browser-only auditor for public GitHub repositories.
Paste a URL, and Astraudit will:

1. Fetch repository metadata, the file tree, README, and known config files
   from GitHub's public API.
2. Detect the stack (language, runtime, package manager, frameworks, build,
   test, and lint tooling).
3. Run rule-based detectors for documentation, structure, code quality,
   security, maintenance, developer experience, ecosystem, and CI/CD.
4. Compute a 0–100 score across eight categories and assign a letter-style
   grade.
5. Produce a structured **Repo Story**, an interactive **Audit Graph**, a
   filterable **Findings** list, and seven prioritized **Next Steps**.

Everything runs locally in the browser. The audit engine runs in a Web Worker
so the UI stays smooth even on large repositories.

## Features

- **Smart input parsing** — accepts `https://github.com/owner/repo`,
  `github.com/owner/repo`, `owner/repo`, `owner/repo.git`, etc.
- **Eight scored categories** — Documentation, Structure, Code Quality,
  Security, Maintenance, Developer Experience, Ecosystem, CI/CD.
- **Interactive graph** — built with React Flow, color-coded by status, with
  per-node evidence and recommendations.
- **Findings panel** — severity- and category-filterable, with evidence,
  affected files, and confidence labels.
- **File structure intelligence** — detected important files, missing baseline
  files, recognized folders, and suspicious filename matches.
- **Maintenance signals** — recent commits, releases, issue/PR counts, topics.
- **Stack detection** — frameworks, build tools, test tools, lint/format
  tools, monorepo tooling, runtimes, and package managers.
- **Premium dark UI** — glass cards, aurora gradients, and a calm,
  high-contrast color system.

## Why no backend?

- No database to host or secure.
- No tokens to manage or leak.
- No supply chain risk from running third-party code.
- Trivial, free, fully reproducible deployment to GitHub Pages.

If a signal can be derived from the public file tree or metadata, it can be
derived right in the browser.

## Security model

Astraudit deliberately does **not**:

- Execute any third-party code.
- `git clone` or `npm install` the audited repository.
- Read file contents to scan for secret values (it only matches *filenames*).
- Use any AI API (Claude, OpenAI, Gemini, …) to generate findings.
- Support private repositories.
- Use any private tokens.

All findings come from rule-based detectors over public GitHub metadata,
filenames, and a limited set of well-known config files (e.g. `package.json`,
`tsconfig.json`, `LICENSE`, `SECURITY.md`).

When a signal cannot be confidently established, Astraudit will display
`Not detected` or `Insufficient evidence` rather than guess.

Astraudit executes no third-party code.
Astraudit only reads public GitHub metadata and files.
Astraudit does not support private repositories.
Astraudit may hit GitHub unauthenticated API rate limits.
Astraudit findings are static signals, not a full security audit.

## Limits & known caveats

- Astraudit uses **unauthenticated** GitHub API calls. Public rate limits
  apply (~60 requests/hour per IP). Heavy users may need to retry later.
- Branch protection rules, repository secrets, and most GitHub settings
  cannot be inspected by a public static audit and are flagged as
  "not available from public static audit."
- Findings are **static signals**, not a complete security audit. A clean
  Astraudit report does **not** mean a project is free of vulnerabilities.
- Very large repositories may be reported as truncated by the GitHub tree
  API; Astraudit displays this and continues with available data.
- Astraudit does not analyze repositories larger than ~60k tree entries to
  keep the browser responsive.

## Tech stack

- [Vite](https://vitejs.dev/) — build tool
- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) — styling
- [React Flow](https://reactflow.dev/) — interactive audit graph
- [lucide-react](https://lucide.dev/) — icons
- A dedicated **Web Worker** runs the audit engine so the UI never blocks
- GitHub REST API (public, unauthenticated) + raw.githubusercontent.com for
  config file content

## Local installation

```bash
npm install
npm run dev
```

Then open the printed local URL.

Other useful scripts:

```bash
npm run typecheck   # strict TypeScript build (no emit)
npm run build       # production build to dist/
npm run preview     # preview the production build locally
```

## Deployment to GitHub Pages

1. Push this repository to GitHub as a public repo named `astraudit`.
2. In **Settings → Pages**, set the **Source** to **GitHub Actions**.
3. The workflow at `.github/workflows/deploy.yml` will run on every push to
   `main`, build the app, and publish `dist/` to GitHub Pages.

The `base` in `vite.config.ts` is set to `/astraudit/` so the build resolves
correctly under `https://<owner>.github.io/astraudit/`.

If you fork this under a different name, update `vite.config.ts` accordingly.

## Roadmap

The full roadmap lives in [`ROADMAP.md`](./ROADMAP.md). It is organized
into four phases (quick wins → UX upgrades → smarter detection →
polish) plus a strict **anti-roadmap** that records the things
Astraudit will never do — backend, serverless, AI APIs, OAuth, private
repos, code execution. Every roadmap item is checked against the
four operating constraints (browser-only, free, public-only,
rule-based) before it is accepted.
