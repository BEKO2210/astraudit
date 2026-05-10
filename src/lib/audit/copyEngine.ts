import type { CategoryScore, RepoStorySection, StackSignals } from "../../types/audit";
import type { RepoBundle } from "../../types/github";
import type { ClassifiedFiles } from "./fileClassifier";
import type { DerivedInsights } from "./insightEngine";

interface CopyContext {
  bundle: RepoBundle;
  insights: DerivedInsights;
  stack: StackSignals;
  classified: ClassifiedFiles;
  categories: CategoryScore[];
}

const sentence = (s: string) => s.replace(/\s+/g, " ").trim();
const join = (parts: string[]): string => parts.filter(Boolean).map(sentence).join(" ");

const pluralize = (n: number, singular: string, plural?: string): string =>
  n === 1 ? `1 ${singular}` : `${n.toLocaleString("en-US")} ${plural ?? `${singular}s`}`;

function projectKind(insights: DerivedInsights, stack: StackSignals): string {
  const monorepo = insights.tree.monorepoShape === "monorepo";
  const hasFramework = stack.frameworks.length > 0;
  const lang = stack.language;
  if (monorepo && hasFramework) return `${lang ?? "polyglot"} monorepo using ${stack.frameworks.slice(0, 2).join(" + ")}`;
  if (monorepo) return `${lang ?? "polyglot"} monorepo`;
  if (hasFramework) return `${lang ?? "polyglot"}-based project using ${stack.frameworks.slice(0, 2).join(" + ")}`;
  if (stack.language === "Rust") return `Rust project`;
  if (stack.language === "Go") return `Go project`;
  if (stack.language === "Python") return `Python project`;
  if (lang) return `${lang}-based project`;
  return `polyglot project`;
}

function runtimeClause(stack: StackSignals): string {
  if (!stack.runtime) return "";
  const lang = stack.language?.toLowerCase() ?? "";
  const rt = stack.runtime.toLowerCase();
  if (lang === rt) return "";
  if ((lang === "javascript" || lang === "typescript") && rt === "node.js") return ` running on Node.js`;
  if (rt === "deno") return ` running on Deno`;
  if (rt === "bun") return ` running on Bun`;
  if (rt === "node.js") return ` running on Node.js`;
  return ` (${stack.runtime} runtime)`;
}

function describeAge(insights: DerivedInsights): string {
  switch (insights.ageBucket) {
    case "newborn":
      return `Newly created — published roughly ${insights.formattedAge}, so trust signals are still forming.`;
    case "young":
      return `Still relatively new at ${insights.formattedAge}; expect documentation and conventions to keep evolving.`;
    case "established":
      return `An established project at ${insights.formattedAge} — long enough for patterns and a contributor base to settle in.`;
    case "mature":
      return `A mature codebase at ${insights.formattedAge}, which usually means clear conventions but also accumulated decisions to navigate.`;
    case "veteran":
      return `A veteran project at ${insights.formattedAge}; expect deep history, layered conventions, and a high bar for changes.`;
  }
}

function describeAudience(insights: DerivedInsights, bundle: RepoBundle): string {
  const stars = bundle.metadata.stars;
  const perMonth = insights.starsPerMonth;
  const labelMap: Record<DerivedInsights["starsBucket"], string> = {
    tiny: `Audience footprint is small (${pluralize(stars, "star")}), so signals carry less of the typical "popular OSS" gravity.`,
    small: `${pluralize(stars, "star")} put it in early-traction territory.`,
    medium: `${pluralize(stars, "star")} place it firmly in the well-known tier.`,
    large: `With ${pluralize(stars, "star")}, this is a widely-followed project.`,
    huge: `${pluralize(stars, "star")} make it one of the largest projects in its niche.`,
    mega: `${pluralize(stars, "star")} put it among the most-starred repositories on GitHub.`,
  };
  const base = labelMap[insights.starsBucket];
  if (perMonth === null) return base;
  if (perMonth >= 500) return `${base} It is still gaining roughly ${perMonth.toLocaleString("en-US")} stars per month — strong, ongoing traction.`;
  if (perMonth >= 50) return `${base} Lifetime growth averages around ${perMonth} stars per month.`;
  if (perMonth >= 5) return `${base} Lifetime growth averages around ${perMonth} stars per month — modest but steady.`;
  if (perMonth > 0) return `${base} Lifetime growth averages well under 5 stars per month.`;
  return base;
}

function describeStack(stack: StackSignals, insights: DerivedInsights): string {
  const facts: string[] = [];
  if (stack.language) {
    facts.push(`Primary language is **${stack.language}** at ${insights.primaryLanguageShare}% of bytes.`);
  }
  if (insights.diversityBucket === "polyglot") {
    facts.push(`The codebase is polyglot — at least three languages share meaningful surface area.`);
  } else if (insights.diversityBucket === "bilingual") {
    facts.push(`A second language carries non-trivial weight, hinting at native bindings, build tooling, or a multi-target setup.`);
  }
  if (stack.packageManager) facts.push(`Package manager: **${stack.packageManager}**.`);
  if (stack.buildTools.length) facts.push(`Build: ${stack.buildTools.join(", ")}.`);
  if (stack.testTools.length) facts.push(`Tests: ${stack.testTools.join(", ")}.`);
  if (stack.lintTools.length) facts.push(`Lint/format: ${stack.lintTools.join(", ")}.`);
  if (stack.monorepoTool) facts.push(`Monorepo tooling: ${stack.monorepoTool}.`);
  if (stack.containerized) facts.push(`Container-friendly — Docker assets are present.`);
  if (facts.length === 0) return "Stack signals are sparse; the project does not lean on standard package configs that this audit can recognize.";
  return facts.join(" ");
}

function describeMaintenance(insights: DerivedInsights, bundle: RepoBundle): string {
  const fresh = insights.freshnessBucket;
  const cadence = insights.commits.bucket;
  const releases = insights.releases;
  const issues = bundle.issues.openIssueCount;
  const prs = bundle.issues.openPRCount;
  const parts: string[] = [];

  switch (fresh) {
    case "fresh":
      parts.push(`Push activity is fresh — last commit landed ${insights.daysSincePush ?? 0} days ago.`);
      break;
    case "recent":
      parts.push(`Push activity is recent (${insights.daysSincePush ?? 0} days since the last push), with ongoing — but not daily — work.`);
      break;
    case "stale":
      parts.push(`The repository has gone quiet: roughly ${insights.daysSincePush} days without a push.`);
      break;
    case "abandoned":
      parts.push(`The repository looks dormant — over a year has passed since the last push.`);
      break;
    case "unknown":
      parts.push(`Push history is unavailable.`);
      break;
  }
  if (cadence !== "unknown" && insights.commits.cadenceDays !== null) {
    const cad = insights.commits.cadenceDays;
    if (cadence === "burst") parts.push(`Recent commits arrive in bursts of multiple per day (avg ${cad}d apart).`);
    else if (cadence === "active") parts.push(`Recent commits average roughly every ${cad} days.`);
    else if (cadence === "steady") parts.push(`Cadence is steady — about ${cad} days between recent commits.`);
    else if (cadence === "occasional") parts.push(`Cadence is occasional, around ${cad} days between recent commits.`);
    else parts.push(`Cadence is rare — typically ${cad}+ days between recent commits.`);
  }
  if (insights.commits.uniqueAuthors > 1) {
    parts.push(`${pluralize(insights.commits.uniqueAuthors, "distinct author")} appear in the recent commit window.`);
  }

  if (releases.count > 0) {
    if (releases.rhythm === "frequent")
      parts.push(`Releases ship frequently (avg ~${releases.averageDaysBetween ?? 0}d apart, latest ${releases.latestTag ?? "unnamed"}).`);
    else if (releases.rhythm === "regular")
      parts.push(`Releases are regular at roughly every ${releases.averageDaysBetween ?? 0} days; latest tag is ${releases.latestTag ?? "unnamed"}.`);
    else if (releases.rhythm === "occasional")
      parts.push(`Releases are occasional (~${releases.averageDaysBetween ?? 0}d apart on average).`);
    else if (releases.rhythm === "rare")
      parts.push(`Tagged releases are rare; the cadence runs longer than six months on average.`);
  } else {
    parts.push(`No tagged releases were detected.`);
  }

  switch (insights.triageHealth) {
    case "healthy":
      parts.push(`Open-issue volume looks well-managed (${issues.toLocaleString("en-US")} open${prs !== null ? `, ${prs} PRs` : ""}).`);
      break;
    case "moderate":
      parts.push(`There is a moderate triage queue: ${issues.toLocaleString("en-US")} issues open${prs !== null ? `, ${prs} PRs` : ""}.`);
      break;
    case "backlog":
      parts.push(`A real backlog has built up — ${issues.toLocaleString("en-US")} open issues${prs !== null ? ` and ${prs} PRs` : ""}.`);
      break;
    case "heavy":
      parts.push(`The triage queue looks heavy: ${issues.toLocaleString("en-US")} open issues${prs !== null ? ` and ${prs} PRs` : ""} relative to community size.`);
      break;
    case "unknown":
      break;
  }
  return join(parts);
}

function describeQuality(ctx: CopyContext): string {
  const cats = ctx.categories;
  const get = (k: string) => cats.find((c) => c.key === k);
  const quality = get("quality");
  const ci = get("ci");
  const docs = get("documentation");
  const sec = get("security");
  const struct = get("structure");

  const wins: string[] = [];
  const gaps: string[] = [];

  if (quality && quality.score / quality.max >= 0.8) wins.push(`code-quality tooling`);
  else if (quality) gaps.push(`code-quality coverage is incomplete`);

  if (ci && ci.score / ci.max >= 0.6) wins.push(`a working CI pipeline`);
  else if (ci) gaps.push(`CI/CD signals are weak or missing`);

  if (docs && docs.score / docs.max >= 0.7) wins.push(`thorough documentation`);
  else if (docs) gaps.push(`documentation has gaps`);

  if (sec && sec.score / sec.max >= 0.7) wins.push(`solid security baseline`);
  else if (sec) gaps.push(`security signals are uneven`);

  if (struct && struct.score / struct.max >= 0.8) wins.push(`a clearly organised tree`);
  else if (struct) gaps.push(`structure could be tighter`);

  const winText = wins.length
    ? `On the strong side: ${wins.join(", ")}.`
    : `Few categories scored as strong.`;
  const gapText = gaps.length
    ? `Where it loses points: ${gaps.join("; ")}.`
    : `No category drags the overall score down significantly.`;
  return `${winText} ${gapText}`;
}

function describeReadme(insights: DerivedInsights): string {
  const r = insights.readme;
  if (!r.exists) return `No README is published, so first-time visitors land without context.`;
  const parts: string[] = [];
  parts.push(
    `The README is roughly ${r.words.toLocaleString("en-US")} words long across ${pluralize(r.headings, "heading")}.`,
  );
  const blocks = [
    r.codeBlocks ? pluralize(r.codeBlocks, "fenced code block") : null,
    r.images ? pluralize(r.images, "image") : null,
    r.links ? pluralize(r.links, "link") : null,
    r.badges ? pluralize(r.badges, "badge") : null,
    r.tables ? pluralize(r.tables, "table row") : null,
  ].filter(Boolean);
  if (blocks.length) parts.push(`It includes ${blocks.join(", ")}.`);
  if (r.sections.length) {
    const top = r.sections.slice(0, 5).join(" · ");
    parts.push(`Detected sections: ${top}${r.sections.length > 5 ? ` …` : ""}.`);
  }
  if (r.words < 200) parts.push(`That is short — most readers need 300+ words to evaluate a project.`);
  else if (r.words < 800) parts.push(`Length is in the "starter" range; usage and examples could probably go deeper.`);
  else if (r.words < 3000) parts.push(`Length is healthy for an OSS project.`);
  else parts.push(`The README is long-form — close to a small docs site on its own.`);
  return join(parts);
}

function describeNextSteps(ctx: CopyContext): string {
  const lowest = [...ctx.categories]
    .sort((a, b) => a.score / a.max - b.score / b.max)
    .slice(0, 3);
  if (lowest.length === 0) return "No immediate next steps were derived from the current signals.";
  const labels = lowest.map((c) => c.label.toLowerCase());
  const top = labels[0];
  return sentence(
    `The fastest score gains come from ${top}. After that, ${labels[1] ?? "documentation"} and ${labels[2] ?? "security"} would compound the improvement. Each of these has at least one finding below with a concrete action.`,
  );
}

export function buildRichStory(ctx: CopyContext): RepoStorySection[] {
  const { bundle, insights, stack } = ctx;
  const desc = bundle.metadata.description?.trim();
  const kind = projectKind(insights, stack);
  const rt = runtimeClause(stack);
  const monorepoNote =
    insights.tree.monorepoShape === "monorepo"
      ? stack.monorepoTool
        ? ` It is laid out as a monorepo using ${stack.monorepoTool}.`
        : ` It is laid out as a monorepo — multiple packages share the same repository.`
      : insights.tree.monorepoShape === "polyrepo"
        ? ` Its top-level layout looks polyrepo-style — packages live in subdirectories.`
        : "";
  const audience = describeAudience(insights, bundle);
  const ageLine = describeAge(insights);

  const projectStory = sentence(
    `${desc ? `"${desc}". ` : ""}This is a ${kind}${rt}.${monorepoNote}`,
  );

  return [
    {
      heading: "What this repository appears to be",
      body: `${projectStory} ${audience}`,
    },
    {
      heading: "Project age and momentum",
      body: ageLine,
    },
    {
      heading: "Stack and tooling",
      body: describeStack(stack, insights),
    },
    {
      heading: "How alive it is",
      body: describeMaintenance(insights, bundle),
    },
    {
      heading: "Where it shines and where it slips",
      body: describeQuality(ctx),
    },
    {
      heading: "What the README tells you",
      body: describeReadme(insights),
    },
    {
      heading: "Best next steps",
      body: describeNextSteps(ctx),
    },
  ];
}

export interface OnboardingStep {
  id: string;
  title: string;
  command?: string;
  rationale: string;
  optional?: boolean;
}

export function buildOnboarding(ctx: CopyContext): OnboardingStep[] {
  const { bundle, insights, stack, classified } = ctx;
  const steps: OnboardingStep[] = [];
  const fullName = bundle.metadata.fullName;
  const repoName = bundle.metadata.name;

  steps.push({
    id: "clone",
    title: `Clone ${fullName}`,
    command: `git clone https://github.com/${fullName}.git`,
    rationale: insights.tree.monorepoShape === "monorepo"
      ? `Monorepo — expect multiple packages under packages/ or apps/.`
      : `Single-package layout based on the file tree.`,
  });

  if (stack.packageManager) {
    const pm = stack.packageManager;
    const installCmd =
      pm === "pnpm" ? "pnpm install"
      : pm === "yarn" ? "yarn install"
      : pm === "bun" ? "bun install"
      : pm === "npm" ? "npm ci"
      : pm === "cargo" ? "cargo build"
      : pm === "go modules" ? "go mod download"
      : pm === "poetry" ? "poetry install"
      : pm === "pipenv" ? "pipenv install"
      : pm === "composer" ? "composer install"
      : `${pm} install`;
    steps.push({
      id: "install",
      title: `Install dependencies with ${pm}`,
      command: `cd ${repoName} && ${installCmd}`,
      rationale: insights.tree.monorepoShape === "monorepo"
        ? `Lockfile detected at the workspace root — install from there for the entire monorepo.`
        : `Lockfile detected — installs will be reproducible.`,
    });
  } else {
    steps.push({
      id: "install",
      title: `Install dependencies`,
      rationale: `No common package manager was detected. Read the README for the project-specific setup.`,
      optional: true,
    });
  }

  if (classified.blobPaths.has(".env.example")) {
    steps.push({
      id: "env",
      title: `Copy the environment template`,
      command: `cp .env.example .env`,
      rationale: `An .env.example exists — use it as a starting point and fill in real values locally.`,
    });
  }

  if (stack.containerized) {
    steps.push({
      id: "docker",
      title: `Try the Docker path`,
      command: classified.blobPaths.has("docker-compose.yml") || classified.blobPaths.has("docker-compose.yaml")
        ? `docker compose up`
        : `docker build -t ${repoName} .`,
      rationale: `Container assets are present, which usually means a one-command local environment.`,
      optional: true,
    });
  }

  const scripts = stack.dependencyCounts ? true : false;
  if (scripts) {
    steps.push({
      id: "dev",
      title: `Start the dev workflow`,
      command: `${stack.packageManager === "pnpm" ? "pnpm" : stack.packageManager === "yarn" ? "yarn" : stack.packageManager === "bun" ? "bun" : "npm"} run dev`,
      rationale: `Most JS/TS projects expose "dev"; check package.json scripts for the actual entry points if unsure.`,
      optional: true,
    });
  }

  if (insights.workflows.hasTest || classified.hasTestSignals) {
    steps.push({
      id: "test",
      title: `Run the test suite before any change`,
      command: stack.packageManager
        ? `${stack.packageManager === "pnpm" ? "pnpm" : stack.packageManager === "yarn" ? "yarn" : stack.packageManager === "bun" ? "bun" : "npm"} test`
        : undefined,
      rationale: insights.workflows.hasTest
        ? `A test workflow runs in CI — keeping it green locally avoids surprises in PRs.`
        : `Tests were detected in the tree even though no CI workflow was found.`,
    });
  }

  if (
    classified.blobPaths.has("CONTRIBUTING.md") ||
    classified.blobPaths.has(".github/CONTRIBUTING.md")
  ) {
    steps.push({
      id: "contrib",
      title: `Read CONTRIBUTING.md before opening a PR`,
      rationale: `The repo publishes contribution guidelines — follow them to avoid the most common rejection reasons.`,
    });
  }

  if (classified.blobPaths.has("CODE_OF_CONDUCT.md")) {
    steps.push({
      id: "coc",
      title: `Skim the Code of Conduct`,
      rationale: `Standard for community projects; read once so PR conversations stay productive.`,
      optional: true,
    });
  }

  return steps.slice(0, 8);
}

export function buildHeadlineVerdict(ctx: CopyContext): string {
  const { insights, categories } = ctx;
  const total = categories.reduce((sum, c) => sum + c.score, 0);
  const max = categories.reduce((sum, c) => sum + c.max, 0);
  const ratio = max ? total / max : 0;
  const audience = insights.audienceLabel;
  const ageBucket = insights.ageBucket;
  const fresh = insights.freshnessBucket;

  const tone =
    ratio >= 0.85 ? "premium"
    : ratio >= 0.7 ? "solid"
    : ratio >= 0.55 ? "workable"
    : ratio >= 0.4 ? "uneven"
    : "fragile";

  const opener: Record<typeof tone, string> = {
    premium: `A premium-grade audit footprint`,
    solid: `Solid fundamentals`,
    workable: `Workable but with visible gaps`,
    uneven: `Uneven baseline`,
    fragile: `Fragile baseline`,
  };

  const freshClause: Record<typeof fresh, string> = {
    fresh: `recently active`,
    recent: `still maintained`,
    stale: `quiet for months`,
    abandoned: `effectively dormant`,
    unknown: `with unknown activity`,
  };

  const ageClause: Record<typeof ageBucket, string> = {
    newborn: `recently published`,
    young: `young`,
    established: `established`,
    mature: `mature`,
    veteran: `veteran`,
  };

  return sentence(
    `${opener[tone]} for a ${ageClause[ageBucket]}, ${freshClause[fresh]} ${audience}.`,
  );
}
