/**
 * Tests for the Phase 3.8 Python + Rust dep-name extractors.
 *
 * The extractors are intentionally narrow — name-only, no version
 * ranges. We lock down the well-known shapes and the most common
 * gotchas (comments, options, environment markers, Poetry's
 * `python` pseudo-key, scoped Cargo sub-tables).
 */

import { describe, expect, it } from "vitest";
import {
  namesFromCargoToml,
  namesFromPyproject,
  namesFromRequirementsTxt,
} from "../../../src/lib/registries/extractDependencyNames";

describe("namesFromRequirementsTxt", () => {
  it("extracts plain names with optional version specifiers", () => {
    const file = [
      "django>=4.2",
      "requests==2.31.0",
      "pyyaml",
      "numpy~=1.26",
    ].join("\n");
    expect(namesFromRequirementsTxt(file)).toEqual([
      "django",
      "requests",
      "pyyaml",
      "numpy",
    ]);
  });

  it("ignores comments, blank lines, and option flags", () => {
    const file = [
      "# Top-level requirements",
      "",
      "-r base.txt",
      "--index-url https://example.com/simple",
      "django>=4.2  # web framework",
      "",
      "https://example.com/wheel.whl",
    ].join("\n");
    expect(namesFromRequirementsTxt(file)).toEqual(["django"]);
  });

  it("strips PEP 508 environment markers", () => {
    expect(
      namesFromRequirementsTxt(
        "psycopg2-binary>=2.9 ; sys_platform == 'linux'",
      ),
    ).toEqual(["psycopg2-binary"]);
  });
});

describe("namesFromPyproject — PEP 621", () => {
  it("extracts entries from `[project] dependencies = [...]`", () => {
    const file = [
      "[project]",
      'name = "astraudit"',
      'dependencies = [',
      '  "django>=4.2",',
      '  "httpx == 0.27.0",',
      '  "pydantic[email]>=2.0",',
      "]",
    ].join("\n");
    expect(namesFromPyproject(file)).toEqual([
      "django",
      "httpx",
      "pydantic",
    ]);
  });

  it("returns an empty array when there's no project section", () => {
    expect(namesFromPyproject('name = "x"\nversion = "1"')).toEqual([]);
  });
});

describe("namesFromPyproject — Poetry table form", () => {
  it("extracts names from `[tool.poetry.dependencies]` and skips `python`", () => {
    const file = [
      "[tool.poetry]",
      'name = "astraudit"',
      "",
      "[tool.poetry.dependencies]",
      'python = "^3.11"',
      'requests = "^2.31"',
      'pyyaml = "*"',
      "",
      "[tool.poetry.dev-dependencies]",
      'pytest = "^8.0"',
    ].join("\n");
    expect(namesFromPyproject(file)).toEqual(["requests", "pyyaml"]);
  });

  it("dedupes when the same name shows up under both PEP 621 and Poetry", () => {
    const file = [
      "[project]",
      'dependencies = ["django>=4.2"]',
      "",
      "[tool.poetry.dependencies]",
      'django = "^4.2"',
      'requests = "*"',
    ].join("\n");
    expect(namesFromPyproject(file)).toEqual(["django", "requests"]);
  });
});

describe("namesFromCargoToml", () => {
  it("extracts entries from `[dependencies]`", () => {
    const file = [
      '[package]',
      'name = "astraudit"',
      "",
      "[dependencies]",
      'serde = "1.0"',
      'tokio = { version = "1", features = ["full"] }',
      'reqwest = "0.11"',
    ].join("\n");
    expect(namesFromCargoToml(file)).toEqual(["serde", "tokio", "reqwest"]);
  });

  it("recognises `[dependencies.name]` sub-tables", () => {
    const file = [
      "[dependencies]",
      'serde = "1.0"',
      "",
      "[dependencies.tokio]",
      'version = "1"',
      'features = ["full"]',
      "",
      "[dependencies.tracing]",
      'version = "0.1"',
    ].join("\n");
    expect(namesFromCargoToml(file)).toEqual(["serde", "tokio", "tracing"]);
  });

  it("stops at the next top-level section", () => {
    const file = [
      "[dependencies]",
      'serde = "1.0"',
      "",
      "[dev-dependencies]",
      'tokio = "1"',
    ].join("\n");
    // `tokio` is in dev-dependencies, NOT [dependencies], so it should be skipped.
    expect(namesFromCargoToml(file)).toEqual(["serde"]);
  });
});
