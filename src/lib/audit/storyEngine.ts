import type { CategoryScore, RepoStorySection, StackSignals } from "../../types/audit";
import type { RepoBundle } from "../../types/github";
import type { ClassifiedFiles } from "./fileClassifier";
import type { MaintenanceSignals } from "./maintenanceDetector";
import type { ReadmeSignals } from "./documentationDetector";

interface StoryContext {
  bundle: RepoBundle;
  stack: StackSignals;
  classified: ClassifiedFiles;
  categories: CategoryScore[];
  maintenance: MaintenanceSignals;
  readme: ReadmeSignals;
}

function describeProject(ctx: StoryContext): string {
  const { bundle, stack, classified } = ctx;
  const parts: string[] = [];
  const langStr = stack.language ? `${stack.language}-based` : "polyglot";
  const frameworkStr =
    stack.frameworks.length > 0
      ? ` using ${stack.frameworks.slice(0, 3).join(", ")}`
      : "";
  const runtimeStr = stack.runtime ? ` on ${stack.runtime}` : "";
  parts.push(
    `This appears to be a ${langStr} project${frameworkStr}${runtimeStr}.`,
  );

  if (bundle.metadata.description) {
    parts.push(`The maintainer describes it as: "${bundle.metadata.description}".`);
  } else {
    parts.push("No repository description was provided by the maintainer.");
  }

  if (stack.monorepoTool) {
    parts.push(`The codebase looks organized as a monorepo (${stack.monorepoTool}).`);
  } else if (
    classified.importantFolders.includes("src") ||
    classified.importantFolders.includes("app") ||
    classified.importantFolders.includes("lib")
  ) {
    parts.push("It uses a recognizable single-package source structure.");
  } else {
    parts.push("Its structure does not match common single-package layouts.");
  }
  return parts.join(" ");
}

function describeTech(ctx: StoryContext): string {
  const { stack, classified } = ctx;
  const facts: string[] = [];
  if (stack.language) facts.push(`primary language ${stack.language}`);
  if (stack.packageManager) facts.push(`package manager ${stack.packageManager}`);
  if (stack.buildTools.length > 0)
    facts.push(`build tooling ${stack.buildTools.join(", ")}`);
  if (stack.testTools.length > 0)
    facts.push(`test tooling ${stack.testTools.join(", ")}`);
  if (stack.lintTools.length > 0)
    facts.push(`lint/format tooling ${stack.lintTools.join(", ")}`);
  if (classified.hasGithubWorkflows) facts.push(`GitHub Actions workflows present`);
  if (stack.containerized) facts.push("containerized via Docker");

  if (facts.length === 0) {
    return "The technology stack could not be confidently detected from public repository files.";
  }
  return `Detected signals: ${facts.join("; ")}.`;
}

function describeMaturity(ctx: StoryContext): string {
  const { maintenance, bundle } = ctx;
  const points: string[] = [];
  if (maintenance.daysSincePush !== null) {
    if (maintenance.daysSincePush <= 30) {
      points.push("It looks actively maintained based on recent push activity.");
    } else if (maintenance.daysSincePush <= 365) {
      points.push("It shows moderate maintenance activity in the past year.");
    } else {
      points.push("It looks largely inactive based on push history.");
    }
  } else {
    points.push("Push history is not available for analysis.");
  }
  if (maintenance.releasesCount > 0) {
    points.push(`There are ${maintenance.releasesCount} published release(s).`);
  } else {
    points.push("No releases were detected.");
  }
  if (bundle.metadata.archived) {
    points.push("The repository is archived by its owner.");
  }
  return points.join(" ");
}

function describeStrong(ctx: StoryContext): string {
  const strong = ctx.categories.filter(
    (c) => c.status === "strong" || c.status === "partial",
  );
  if (strong.length === 0) {
    return "No category produced strong evidence.";
  }
  const ordered = strong
    .sort((a, b) => b.score / b.max - a.score / a.max)
    .slice(0, 3);
  return `Strongest areas: ${ordered.map((c) => c.label.toLowerCase()).join(", ")}.`;
}

function describeRisks(ctx: StoryContext): string {
  const risky = ctx.categories.filter(
    (c) => c.status === "missing" || c.status === "weak",
  );
  if (risky.length === 0) {
    return "No major risk areas were detected.";
  }
  const ordered = risky
    .sort((a, b) => a.score / a.max - b.score / b.max)
    .slice(0, 3);
  return `Most risky areas: ${ordered.map((c) => c.label.toLowerCase()).join(", ")}.`;
}

function describeNextSteps(ctx: StoryContext): string {
  const lowest = [...ctx.categories]
    .sort((a, b) => a.score / a.max - b.score / b.max)
    .slice(0, 2);
  if (lowest.length === 0) {
    return "No immediate next steps were derived from the current signals.";
  }
  const labels = lowest.map((c) => c.label.toLowerCase()).join(" and ");
  return `The fastest improvements would target ${labels}.`;
}

export function buildRepoStory(ctx: StoryContext): RepoStorySection[] {
  return [
    {
      heading: "What this repository appears to be",
      body: describeProject(ctx),
    },
    {
      heading: "Main technology signals",
      body: describeTech(ctx),
    },
    {
      heading: "How mature it looks",
      body: describeMaturity(ctx),
    },
    {
      heading: "What is strong",
      body: describeStrong(ctx),
    },
    {
      heading: "What is risky",
      body: describeRisks(ctx),
    },
    {
      heading: "Best next steps",
      body: describeNextSteps(ctx),
    },
  ];
}
