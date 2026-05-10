import { describe, expect, it } from "vitest";
import {
  filterCommands,
  scoreCommandMatch,
  type Command,
} from "../../../src/lib/commands/types";

const noop = () => {};

const cmd = (id: string, title: string, group: Command["group"] = "actions"): Command => ({
  id,
  title,
  group,
  action: noop,
});

describe("scoreCommandMatch", () => {
  it("returns 1 for an empty query (everything matches)", () => {
    expect(scoreCommandMatch("", cmd("x", "Anything"))).toBe(1);
  });

  it("ranks exact matches highest, prefix next, substring then subsequence", () => {
    const exact = scoreCommandMatch("score", cmd("a", "score"));
    const prefix = scoreCommandMatch("score", cmd("b", "score breakdown"));
    const sub = scoreCommandMatch("score", cmd("c", "show the score panel"));
    const seq = scoreCommandMatch("scrn", cmd("d", "screen reader notes"));
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(sub);
    expect(sub).toBeGreaterThan(seq);
  });

  it("returns 0 for non-matching queries", () => {
    expect(scoreCommandMatch("zzz", cmd("a", "Save as PDF"))).toBe(0);
  });
});

describe("filterCommands", () => {
  const all = [
    cmd("a", "Jump to Score"),
    cmd("b", "Jump to Findings"),
    cmd("c", "Jump to Insights"),
    cmd("d", "Open settings"),
    cmd("e", "Theme: Dark"),
  ];

  it("returns all commands when query is empty", () => {
    expect(filterCommands(all, "")).toEqual(all);
    expect(filterCommands(all, "  ")).toEqual(all);
  });

  it("filters and ranks by relevance", () => {
    const result = filterCommands(all, "find");
    expect(result.map((c) => c.title)).toEqual(["Jump to Findings"]);
  });

  it("prefers exact / prefix over subsequence", () => {
    const candidates = [
      cmd("a", "Jump to Theme settings"),
      cmd("b", "Theme: Dark"),
    ];
    const result = filterCommands(candidates, "theme");
    expect(result[0].id).toBe("b"); // prefix match wins
  });
});
