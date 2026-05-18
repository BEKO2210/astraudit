#!/usr/bin/env tsx
/**
 * Astraudit awesome-list entry generator — Roadmap M8.1.
 *
 * Single source of truth for the per-list submission snippets.
 * Each awesome-list family has slightly different conventions
 * (separator, badge column, license suffix, etc.) — this
 * script renders the project's canonical description into every
 * variant from one place. Edit the description ONCE here and
 * every list's entry stays in sync.
 *
 * Usage
 *   npx tsx scripts/awesome-list-entries.ts            # human dump
 *   npx tsx scripts/awesome-list-entries.ts --json     # machine
 *   npx tsx scripts/awesome-list-entries.ts <list-id>  # one entry
 *
 * `<list-id>` is one of the keys below (`github` / `static-analysis`
 * / `dev-tools` / `mcp` / `dx-onboarding` / `repo-tools` /
 * `code-quality`). The script never opens a network connection
 * or touches the filesystem — it only prints to stdout.
 */

interface ProjectFacts {
  name: string;
  homepage: string;
  repo: string;
  license: string;
  shortPitch: string;
  longPitch: string;
}

const FACTS: ProjectFacts = {
  name: "Astraudit",
  homepage: "https://beko2210.github.io/astraudit/",
  repo: "https://github.com/BEKO2210/astraudit",
  license: "MIT",
  shortPitch:
    "Browser-only auditor for public GitHub repositories: 100-point score across eight categories, interactive audit graph, prioritised next steps.",
  longPitch:
    "100-point browser-only health-check for any public GitHub repository. Eight scored categories, interactive audit graph, prioritised next-steps, Markdown / JSON / AsciiDoc / PDF export. No backend, no signup, rule-based (not AI). Ships an MCP server for AI clients.",
};

interface ListSpec {
  id: string;
  /** Display name for the human dump. */
  label: string;
  /** Repo URL of the awesome list. */
  target: string;
  /** Where in the README the entry belongs. */
  section: string;
  /** Render the canonical entry markdown for this list's conventions. */
  render: (facts: ProjectFacts) => string;
  /** PR title to use. */
  prTitle: string;
}

const LISTS: ListSpec[] = [
  {
    id: "github",
    label: "awesome-github",
    target: "https://github.com/phillipadsmith/awesome-github",
    section: "Tools (or Apps & Services)",
    prTitle: `Add ${FACTS.name} (browser-only repo auditor)`,
    render: (f) =>
      `- [${f.name}](${f.repo}) - ${f.shortPitch} No backend, no signup. ${f.license}.`,
  },
  {
    id: "static-analysis",
    label: "awesome-static-analysis",
    target: "https://github.com/mre/awesome-static-analysis",
    section: "Multiple languages / Other → General",
    prTitle: `Add ${FACTS.name} (browser-only repo auditor)`,
    render: (f) =>
      // awesome-static-analysis style: em-dash, copyright + license inline.
      `- [${f.name}](${f.repo}) — :copyright: ${f.license} — Browser-only static auditor for public GitHub repositories: scores repos 0–100 across eight weighted categories with rule-based detectors. Includes an MCP server for AI clients.`,
  },
  {
    id: "dev-tools",
    label: "awesome-developer-tools",
    target: "https://github.com/Granze/awesome-developer-tools-and-services",
    section: "Code Quality / Repository Tools",
    prTitle: `Add ${FACTS.name} (browser-only repo auditor)`,
    render: (f) =>
      `- [${f.name}](${f.repo}) - ${f.longPitch}`,
  },
  {
    id: "mcp",
    label: "awesome-mcp-servers",
    target: "https://github.com/punkpeye/awesome-mcp-servers",
    section: "Developer Tools",
    prTitle: `Add ${FACTS.name} MCP server`,
    render: (f) =>
      // MCP list cares about the server bin name, not the web app.
      `- [astraudit-mcp](${f.repo}) - Exposes Astraudit's GitHub-repository auditor as MCP tools. Same rule-based engine the web app uses; spawn with \`npx astraudit-mcp\`. ${f.license}.`,
  },
  {
    id: "dx-onboarding",
    label: "awesome-developer-experience",
    target: "https://github.com/wbinnssmith/awesome-developer-experience",
    section: "Tooling",
    prTitle: `Add ${FACTS.name}`,
    render: (f) =>
      `- [${f.name}](${f.repo}) — ${f.shortPitch} Surfaces missing CONTRIBUTING.md, CODEOWNERS, security policy, lockfiles, dependabot config, and ~30 other onboarding signals in one report.`,
  },
  {
    id: "repo-tools",
    label: "awesome-repo-management",
    target: "https://github.com/jondot/awesome-devenv",
    section: "Repository inspection",
    prTitle: `Add ${FACTS.name}`,
    render: (f) =>
      `- [${f.name}](${f.repo}) - ${f.shortPitch} Runs entirely in the browser; an optional PAT lifts the GitHub rate limit. ${f.license}.`,
  },
  {
    id: "code-quality",
    label: "awesome-code-quality",
    target: "https://github.com/wbinnssmith/awesome-code-quality",
    section: "Analysis",
    prTitle: `Add ${FACTS.name}`,
    render: (f) =>
      `- [${f.name}](${f.repo}) - Repository-level health-check: docs, security, maintenance, CI, structure scored from public metadata only. Rule book at ${f.repo}/blob/main/docs/RULES.md.`,
  },
];

interface RenderedEntry {
  id: string;
  label: string;
  target: string;
  section: string;
  prTitle: string;
  entry: string;
}

/** Render every list's entry. Exported so tests + tooling can consume. */
export function renderAllEntries(facts: ProjectFacts = FACTS): RenderedEntry[] {
  return LISTS.map((spec) => ({
    id: spec.id,
    label: spec.label,
    target: spec.target,
    section: spec.section,
    prTitle: spec.prTitle,
    entry: spec.render(facts),
  }));
}

export function renderEntry(
  id: string,
  facts: ProjectFacts = FACTS,
): RenderedEntry | null {
  const spec = LISTS.find((l) => l.id === id);
  if (!spec) return null;
  return {
    id: spec.id,
    label: spec.label,
    target: spec.target,
    section: spec.section,
    prTitle: spec.prTitle,
    entry: spec.render(facts),
  };
}

function formatHuman(entries: RenderedEntry[]): string {
  const out: string[] = [];
  out.push(`# Astraudit · awesome-list submission kit`);
  out.push("");
  out.push(`Project: ${FACTS.name} · ${FACTS.homepage}`);
  out.push(`Repo: ${FACTS.repo} · ${FACTS.license}`);
  out.push("");
  for (const e of entries) {
    out.push(`## ${e.label} (${e.id})`);
    out.push("");
    out.push(`- **Target:** ${e.target}`);
    out.push(`- **Section:** ${e.section}`);
    out.push(`- **PR title:** \`${e.prTitle}\``);
    out.push(`- **Entry:**`);
    out.push("");
    out.push("```md");
    out.push(e.entry);
    out.push("```");
    out.push("");
  }
  return out.join("\n");
}

function main(): void {
  const args = process.argv.slice(2);
  const wantsJson = args.includes("--json");
  const filterId = args.find((a) => !a.startsWith("--"));

  if (filterId) {
    const one = renderEntry(filterId);
    if (!one) {
      // eslint-disable-next-line no-console
      console.error(`Unknown list id: ${filterId}`);
      // eslint-disable-next-line no-console
      console.error(`Known ids: ${LISTS.map((l) => l.id).join(", ")}`);
      process.exit(1);
    }
    if (wantsJson) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(one, null, 2));
    } else {
      // eslint-disable-next-line no-console
      console.log(one.entry);
    }
    return;
  }
  const all = renderAllEntries();
  if (wantsJson) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(all, null, 2));
  } else {
    // eslint-disable-next-line no-console
    console.log(formatHuman(all));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { FACTS, LISTS };
