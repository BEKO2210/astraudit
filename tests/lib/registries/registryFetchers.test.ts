/**
 * Tests for the Phase 3.8 registry fetchers.
 *
 * We mock `fetch` to verify each fetcher correctly parses the
 * documented response shape and surfaces the right outcome envelope
 * (`ok` / `not-found` / `error`). Mock data mirrors the real
 * payloads from `registry.npmjs.org`, `pypi.org`, and `crates.io`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchNpmMetadata } from "../../../src/lib/registries/npmRegistry";
import { fetchPypiMetadata } from "../../../src/lib/registries/pypiRegistry";
import { fetchCratesMetadata } from "../../../src/lib/registries/cratesRegistry";

interface MockResponseInit {
  status?: number;
  body?: unknown;
  ok?: boolean;
}

function mockFetchOk(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function mockFetchStatus(status: number) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({}),
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/* -------------------------------------------------------------------------- */

describe("fetchNpmMetadata", () => {
  it("parses a typical packument", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk({
        name: "react",
        "dist-tags": { latest: "18.3.1" },
        time: { "18.3.1": "2024-04-22T12:00:00Z" },
        homepage: "https://react.dev/",
      }),
    );
    const out = await fetchNpmMetadata("react");
    expect(out.kind).toBe("ok");
    if (out.kind === "ok") {
      expect(out.metadata).toMatchObject({
        ecosystem: "npm",
        name: "react",
        latestVersion: "18.3.1",
        lastPublishedAt: "2024-04-22T12:00:00Z",
        deprecated: false,
        homepage: "https://react.dev/",
      });
    }
  });

  it("URL-encodes scoped package names", async () => {
    const fetchMock = mockFetchOk({
      name: "@types/react",
      "dist-tags": { latest: "18.2.0" },
      time: { "18.2.0": "2024-01-01T00:00:00Z" },
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchNpmMetadata("@types/react");
    const url = fetchMock.mock.calls[0][0];
    expect(url).toBe("https://registry.npmjs.org/@types%2Freact");
  });

  it("flags top-level `deprecated` strings", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk({
        name: "request",
        "dist-tags": { latest: "2.88.2" },
        time: { "2.88.2": "2020-02-11T00:00:00Z" },
        deprecated: "request has been deprecated",
      }),
    );
    const out = await fetchNpmMetadata("request");
    expect(out.kind).toBe("ok");
    if (out.kind === "ok") expect(out.metadata.deprecated).toBe(true);
  });

  it("flags per-version deprecation when the top-level field is missing", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk({
        name: "moment",
        "dist-tags": { latest: "2.30.1" },
        time: { "2.30.1": "2024-01-01T00:00:00Z" },
        versions: { "2.30.1": { deprecated: "Use date-fns or luxon instead" } },
      }),
    );
    const out = await fetchNpmMetadata("moment");
    expect(out.kind).toBe("ok");
    if (out.kind === "ok") expect(out.metadata.deprecated).toBe(true);
  });

  it("returns `not-found` on HTTP 404", async () => {
    vi.stubGlobal("fetch", mockFetchStatus(404));
    const out = await fetchNpmMetadata("definitely-not-a-real-package");
    expect(out.kind).toBe("not-found");
  });

  it("returns `error` on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const out = await fetchNpmMetadata("react");
    expect(out.kind).toBe("error");
    if (out.kind === "error") expect(out.reason).toContain("network down");
  });

  it("extracts top-level `license` strings (Phase 3.9)", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk({
        name: "react",
        "dist-tags": { latest: "18.3.1" },
        time: { "18.3.1": "2024-04-22T12:00:00Z" },
        license: "MIT",
      }),
    );
    const out = await fetchNpmMetadata("react");
    expect(out.kind).toBe("ok");
    if (out.kind === "ok") expect(out.metadata.license).toBe("MIT");
  });

  it("falls back to the latest version's license when the top-level field is missing", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk({
        name: "fancy",
        "dist-tags": { latest: "1.0.0" },
        time: { "1.0.0": "2024-01-01T00:00:00Z" },
        versions: { "1.0.0": { license: "Apache-2.0" } },
      }),
    );
    const out = await fetchNpmMetadata("fancy");
    expect(out.kind).toBe("ok");
    if (out.kind === "ok") expect(out.metadata.license).toBe("Apache-2.0");
  });

  it("flattens the legacy object form `{ type: 'MIT' }`", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk({
        name: "old",
        "dist-tags": { latest: "1.0.0" },
        time: { "1.0.0": "2018-01-01T00:00:00Z" },
        license: { type: "MIT" },
      }),
    );
    const out = await fetchNpmMetadata("old");
    if (out.kind === "ok") expect(out.metadata.license).toBe("MIT");
  });
});

/* -------------------------------------------------------------------------- */

describe("fetchPypiMetadata", () => {
  it("parses a typical Warehouse JSON response", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk({
        info: {
          name: "Django",
          version: "5.0.1",
          home_page: "https://www.djangoproject.com/",
        },
        releases: {
          "5.0.1": [{ upload_time_iso_8601: "2024-01-02T12:00:00Z" }],
          "5.0.0": [{ upload_time_iso_8601: "2023-12-04T12:00:00Z" }],
        },
      }),
    );
    const out = await fetchPypiMetadata("Django");
    expect(out.kind).toBe("ok");
    if (out.kind === "ok") {
      expect(out.metadata).toMatchObject({
        ecosystem: "pypi",
        name: "Django",
        latestVersion: "5.0.1",
        lastPublishedAt: "2024-01-02T12:00:00Z",
      });
    }
  });

  it("returns `not-found` on 404", async () => {
    vi.stubGlobal("fetch", mockFetchStatus(404));
    const out = await fetchPypiMetadata("nonexistent-pkg");
    expect(out.kind).toBe("not-found");
  });

  it("falls back to project_urls.Homepage when home_page is empty", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk({
        info: {
          name: "rich",
          version: "13.7.0",
          project_urls: { Homepage: "https://github.com/Textualize/rich" },
        },
        releases: { "13.7.0": [{ upload_time_iso_8601: "2024-02-29T00:00:00Z" }] },
      }),
    );
    const out = await fetchPypiMetadata("rich");
    expect(out.kind).toBe("ok");
    if (out.kind === "ok") {
      expect(out.metadata.homepage).toBe("https://github.com/Textualize/rich");
    }
  });

  it("prefers PEP 639 license_expression > info.license > classifiers (Phase 3.9)", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk({
        info: {
          name: "django",
          version: "5.0.1",
          license: "BSD",
          license_expression: "BSD-3-Clause",
          classifiers: [
            "License :: OSI Approved :: BSD License",
          ],
        },
        releases: { "5.0.1": [{ upload_time_iso_8601: "2024-01-02T00:00:00Z" }] },
      }),
    );
    const out = await fetchPypiMetadata("django");
    if (out.kind === "ok") expect(out.metadata.license).toBe("BSD-3-Clause");
  });

  it("derives the license from a trove classifier when nothing else is set", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk({
        info: {
          name: "old-pkg",
          version: "1.0.0",
          classifiers: ["License :: OSI Approved :: MIT License"],
        },
        releases: { "1.0.0": [{ upload_time_iso_8601: "2020-01-01T00:00:00Z" }] },
      }),
    );
    const out = await fetchPypiMetadata("old-pkg");
    if (out.kind === "ok") expect(out.metadata.license).toBe("MIT License");
  });
});

/* -------------------------------------------------------------------------- */

describe("fetchCratesMetadata", () => {
  it("parses the canonical crate response", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk({
        crate: {
          name: "serde",
          max_stable_version: "1.0.197",
          max_version: "1.0.197",
          updated_at: "2024-02-19T00:00:00Z",
          recent_downloads: 22_000_000,
          repository: "https://github.com/serde-rs/serde",
          homepage: "https://serde.rs/",
        },
      }),
    );
    const out = await fetchCratesMetadata("serde");
    expect(out.kind).toBe("ok");
    if (out.kind === "ok") {
      expect(out.metadata).toMatchObject({
        ecosystem: "crates",
        name: "serde",
        latestVersion: "1.0.197",
        lastPublishedAt: "2024-02-19T00:00:00Z",
        recentDownloads: 22_000_000,
        homepage: "https://serde.rs/",
      });
    }
  });

  it("falls back to max_version when max_stable_version is null", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk({
        crate: {
          name: "experimental-crate",
          max_stable_version: null,
          max_version: "0.1.0-alpha.3",
          updated_at: "2024-03-01T00:00:00Z",
        },
      }),
    );
    const out = await fetchCratesMetadata("experimental-crate");
    expect(out.kind).toBe("ok");
    if (out.kind === "ok") {
      expect(out.metadata.latestVersion).toBe("0.1.0-alpha.3");
    }
  });

  it("returns `error` when the response body is malformed", async () => {
    vi.stubGlobal("fetch", mockFetchOk({})); // no `crate` field
    const out = await fetchCratesMetadata("malformed");
    expect(out.kind).toBe("error");
  });

  it("returns `not-found` on 404", async () => {
    vi.stubGlobal("fetch", mockFetchStatus(404));
    const out = await fetchCratesMetadata("nope");
    expect(out.kind).toBe("not-found");
  });

  it("pulls the license from the matching version entry (Phase 3.9)", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk({
        crate: {
          name: "serde",
          max_stable_version: "1.0.197",
          updated_at: "2024-02-19T00:00:00Z",
        },
        versions: [
          { num: "1.0.196", license: "Apache-2.0 OR MIT" }, // not the latest
          { num: "1.0.197", license: "MIT OR Apache-2.0" },
        ],
      }),
    );
    const out = await fetchCratesMetadata("serde");
    if (out.kind === "ok") expect(out.metadata.license).toBe("MIT OR Apache-2.0");
  });
});
