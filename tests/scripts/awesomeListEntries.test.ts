import { describe, expect, it } from "vitest";
import {
  FACTS,
  LISTS,
  renderAllEntries,
  renderEntry,
} from "../../scripts/awesome-list-entries";

describe("awesome-list-entries (M8.1)", () => {
  it("renders an entry for every registered list", () => {
    const entries = renderAllEntries();
    expect(entries).toHaveLength(LISTS.length);
    for (const entry of entries) {
      expect(entry.entry.length).toBeGreaterThan(40);
      expect(entry.entry).toContain(FACTS.repo);
    }
  });

  it("starts every entry with the markdown list marker", () => {
    for (const e of renderAllEntries()) {
      expect(e.entry.startsWith("- ")).toBe(true);
    }
  });

  it("renderEntry returns null for an unknown id", () => {
    expect(renderEntry("nope")).toBeNull();
  });

  it("returns a single entry by id (case match)", () => {
    const one = renderEntry("github");
    expect(one?.label).toBe("awesome-github");
    expect(one?.entry).toContain("Astraudit");
  });

  it("PR titles never reuse the word 'awesome' (anti-spam convention)", () => {
    for (const e of renderAllEntries()) {
      expect(e.prTitle.toLowerCase().includes("awesome")).toBe(false);
    }
  });

  it("static-analysis variant carries the inline license badge", () => {
    const one = renderEntry("static-analysis");
    expect(one?.entry).toContain(":copyright:");
    expect(one?.entry).toContain("MIT");
  });

  it("mcp variant references the bin name, not the homepage", () => {
    const one = renderEntry("mcp");
    expect(one?.entry).toContain("astraudit-mcp");
    expect(one?.entry).not.toContain("npx astraudit ");
  });
});
