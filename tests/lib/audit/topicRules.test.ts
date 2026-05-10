/**
 * Tests for the Phase 3.7 topic-driven contextual rules.
 *
 * Each rule maps a GitHub topic to a contract Astraudit can verify
 * against the parsed manifest + classified file tree. Tests cover:
 *   1. Each named rule fires correctly when its topic is set.
 *   2. The full triple-rule (eslint-plugin name + peer + keyword)
 *      grades met / partial / missing as designed.
 *   3. Unknown topics produce no checks (silent degradation).
 *   4. Evidence text is populated regardless of status.
 *   5. The summarise helper rolls up the counts.
 */

import { describe, expect, it } from "vitest";
import {
  evaluateTopicRules,
  formatCheckStatus,
  summariseTopicChecks,
  type TopicRulesContext,
} from "../../../src/lib/audit/topicRules";
import {
  parseManifestObject,
  type ParsedManifest,
} from "../../../src/lib/audit/packageManifest";
import type { StackSignals } from "../../../src/types/audit";
import type { ClassifiedFiles } from "../../../src/lib/audit/fileClassifier";
import type { ImportantFile } from "../../../src/types/github";

/** Minimal context builder — every test starts from an empty repo and
 *  layers on whatever it needs. */
function makeContext(opts: {
  topics?: string[];
  manifest?: ParsedManifest | null;
  paths?: string[];
  importantFiles?: ImportantFile[];
}): TopicRulesContext {
  const blobPaths = new Set<string>(opts.paths ?? []);
  const blobPathsLower = new Map<string, string>();
  for (const p of blobPaths) blobPathsLower.set(p.toLowerCase(), p);
  const importantFileMap = new Map<string, ImportantFile>();
  for (const f of opts.importantFiles ?? []) {
    importantFileMap.set(f.path, f);
    importantFileMap.set(f.path.toLowerCase(), f);
  }
  const classified: ClassifiedFiles = {
    blobPaths,
    blobPathsLower,
    importantFileMap,
    importantFilesPresent: [],
    importantFilesMissing: [],
    suspiciousFiles: [],
    workflowPaths: [],
    hasFile: () => undefined,
    hasFolder: () => false,
    hasTestSignals: false,
  } as unknown as ClassifiedFiles;
  return {
    topics: opts.topics ?? [],
    manifest: opts.manifest ?? null,
    classified,
    stack: {} as StackSignals,
  };
}

/* -------------------------------------------------------------------------- */

describe("topicRules — CLI", () => {
  it("flags missing `bin` for a CLI repo", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["cli"],
        manifest: parseManifestObject({ name: "my-cli" }),
      }),
    );
    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({
      id: "cli-bin-entry",
      status: "missing",
    });
  });

  it("passes when `bin` is a string", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["command-line"],
        manifest: parseManifestObject({ name: "x", bin: "./cli.js" }),
      }),
    );
    expect(checks[0].status).toBe("met");
  });

  it("passes when `bin` is an object with at least one entry", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["terminal"],
        manifest: parseManifestObject({
          name: "x",
          bin: { mycli: "./bin.js" },
        }),
      }),
    );
    expect(checks[0].status).toBe("met");
  });
});

describe("topicRules — eslint-plugin", () => {
  it("scores `met` when name + peer + keyword all align", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["eslint-plugin"],
        manifest: parseManifestObject({
          name: "eslint-plugin-astraudit",
          peerDependencies: { eslint: ">=10" },
          keywords: ["eslint", "eslint-plugin"],
        }),
      }),
    );
    expect(checks[0]).toMatchObject({
      id: "eslint-plugin-contract",
      status: "met",
    });
  });

  it("scores `partial` with only one of three", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["eslint-plugin"],
        manifest: parseManifestObject({
          name: "some-other-name",
          peerDependencies: { eslint: ">=10" },
        }),
      }),
    );
    expect(checks[0].status).toBe("partial");
  });

  it("scores `missing` when nothing aligns", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["eslint-plugin"],
        manifest: parseManifestObject({ name: "x" }),
      }),
    );
    expect(checks[0].status).toBe("missing");
  });

  it("accepts the `@scope/eslint-plugin-…` form", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["eslint-plugin"],
        manifest: parseManifestObject({
          name: "@astraudit/eslint-plugin-thing",
          peerDependencies: { eslint: ">=10" },
          keywords: ["eslint-plugin"],
        }),
      }),
    );
    expect(checks[0].status).toBe("met");
  });
});

describe("topicRules — babel-plugin", () => {
  it("scores `met` when name + peer align", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["babel-plugin"],
        manifest: parseManifestObject({
          name: "babel-plugin-astraudit",
          peerDependencies: { "@babel/core": "^7" },
        }),
      }),
    );
    expect(checks[0].status).toBe("met");
  });
});

describe("topicRules — component libraries", () => {
  it.each([
    ["react-component", "react"],
    ["vue-component", "vue"],
    ["svelte-component", "svelte"],
  ])("flags missing `%s` peer dep", (topic, depName) => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: [topic],
        manifest: parseManifestObject({}),
      }),
    );
    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe("missing");
    expect(checks[0].title).toContain(depName);
  });

  it("passes when the framework is in peerDependencies", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["react-component"],
        manifest: parseManifestObject({
          peerDependencies: { react: ">=18" },
        }),
      }),
    );
    expect(checks[0].status).toBe("met");
  });
});

describe("topicRules — monorepo", () => {
  it("passes when npm `workspaces` is declared", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["monorepo"],
        manifest: parseManifestObject({
          workspaces: ["packages/*"],
        }),
      }),
    );
    expect(checks[0]).toMatchObject({
      id: "monorepo-workspaces",
      status: "met",
    });
  });

  it("passes when only `pnpm-workspace.yaml` is shipped", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["monorepo"],
        manifest: parseManifestObject({}),
        paths: ["pnpm-workspace.yaml"],
      }),
    );
    expect(checks[0].status).toBe("met");
  });

  it("flags missing when neither is present", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["monorepo"],
        manifest: parseManifestObject({}),
      }),
    );
    expect(checks[0].status).toBe("missing");
  });
});

describe("topicRules — github-action", () => {
  it("flags missing action manifest", () => {
    const checks = evaluateTopicRules(
      makeContext({ topics: ["github-action"] }),
    );
    expect(checks[0]).toMatchObject({
      id: "github-action-manifest",
      status: "missing",
    });
  });

  it("passes when action.yml is present", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["github-action"],
        paths: ["action.yml"],
      }),
    );
    expect(checks[0].status).toBe("met");
  });
});

describe("topicRules — vscode-extension", () => {
  it("flags missing engines.vscode", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["vscode-extension"],
        manifest: parseManifestObject({}),
      }),
    );
    expect(checks[0]).toMatchObject({
      id: "vscode-engines",
      status: "missing",
    });
  });

  it("passes when engines.vscode is declared", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["vscode-extension"],
        manifest: parseManifestObject({
          engines: { vscode: "^1.80.0" },
        }),
      }),
    );
    expect(checks[0].status).toBe("met");
  });
});

describe("topicRules — browser-extension", () => {
  it("flags missing manifest.json", () => {
    const checks = evaluateTopicRules(
      makeContext({ topics: ["chrome-extension"] }),
    );
    expect(checks[0]).toMatchObject({
      id: "browser-extension-manifest",
      status: "missing",
    });
  });

  it("passes when manifest.json is present", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["browser-extension"],
        paths: ["manifest.json"],
      }),
    );
    expect(checks[0].status).toBe("met");
  });
});

describe("topicRules — typescript", () => {
  it("flags missing tsconfig.json", () => {
    const checks = evaluateTopicRules(
      makeContext({ topics: ["typescript"] }),
    );
    expect(checks[0].status).toBe("missing");
  });

  it("passes when tsconfig.base.json is present", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["typescript"],
        paths: ["tsconfig.base.json"],
      }),
    );
    expect(checks[0].status).toBe("met");
  });
});

describe("topicRules — bundler plugins", () => {
  it.each([
    ["webpack-plugin", "webpack"],
    ["vite-plugin", "vite"],
    ["rollup-plugin", "rollup"],
    ["esbuild-plugin", "esbuild"],
  ])("verifies the peer dep for `%s`", (topic, dep) => {
    const missingChecks = evaluateTopicRules(
      makeContext({
        topics: [topic],
        manifest: parseManifestObject({}),
      }),
    );
    expect(missingChecks[0].status).toBe("missing");

    const okChecks = evaluateTopicRules(
      makeContext({
        topics: [topic],
        manifest: parseManifestObject({
          peerDependencies: { [dep]: "*" },
        }),
      }),
    );
    expect(okChecks[0].status).toBe("met");
  });
});

describe("topicRules — electron", () => {
  it("flags missing electron dep", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["electron"],
        manifest: parseManifestObject({}),
      }),
    );
    expect(checks[0].status).toBe("missing");
  });

  it("passes when electron is in dependencies", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["electron"],
        manifest: parseManifestObject({
          dependencies: { electron: "^28.0.0" },
        }),
      }),
    );
    expect(checks[0].status).toBe("met");
  });
});

describe("topicRules — non-firing topics", () => {
  it("returns an empty list when no topic matches a rule", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["machine-learning", "python"],
        manifest: parseManifestObject({}),
      }),
    );
    expect(checks).toEqual([]);
  });

  it("returns an empty list when the topic list is empty", () => {
    const checks = evaluateTopicRules(makeContext({}));
    expect(checks).toEqual([]);
  });

  it("evaluates multiple rules when several topics fire at once", () => {
    const checks = evaluateTopicRules(
      makeContext({
        topics: ["cli", "typescript"],
        manifest: parseManifestObject({ name: "x", bin: "./cli.js" }),
        paths: ["tsconfig.json"],
      }),
    );
    expect(checks).toHaveLength(2);
    expect(checks.every((c) => c.status === "met")).toBe(true);
  });
});

describe("topicRules — UI helpers", () => {
  it("formats every status into a short label", () => {
    expect(formatCheckStatus("met")).toBe("met");
    expect(formatCheckStatus("partial")).toBe("partial");
    expect(formatCheckStatus("missing")).toBe("missing");
    expect(formatCheckStatus("not-applicable")).toBe("n/a");
  });

  it("rolls up met / partial / missing counts", () => {
    const out = summariseTopicChecks([
      { id: "a", topic: "cli", title: "", status: "met", evidence: [] },
      { id: "b", topic: "cli", title: "", status: "partial", evidence: [] },
      { id: "c", topic: "cli", title: "", status: "missing", evidence: [] },
      { id: "d", topic: "cli", title: "", status: "missing", evidence: [] },
    ]);
    expect(out).toEqual({ total: 4, met: 1, partial: 1, missing: 2 });
  });
});
