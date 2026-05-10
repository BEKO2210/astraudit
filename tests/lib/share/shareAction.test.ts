import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { performShare } from "../../../src/lib/share/shareAction";

const coords = { owner: "facebook", repo: "react" };

interface MockNavigator {
  share?: (data: { title?: string; url?: string }) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

function stubNavigator(impl: MockNavigator) {
  vi.stubGlobal("navigator", impl);
  vi.stubGlobal("window", { location: { origin: "https://test.example", pathname: "/", search: "" } });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("performShare", () => {
  it("returns 'shared' when navigator.share resolves", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share });
    const result = await performShare(coords);
    expect(result).toEqual({ kind: "shared" });
    expect(share).toHaveBeenCalledOnce();
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Astraudit · facebook/react",
        url: expect.stringContaining("#/audit/facebook/react"),
      }),
    );
  });

  it("returns 'cancelled' when navigator.share rejects with AbortError", async () => {
    const abortErr = Object.assign(new Error("abort"), { name: "AbortError" });
    stubNavigator({ share: vi.fn().mockRejectedValue(abortErr) });
    const result = await performShare(coords);
    expect(result).toEqual({ kind: "cancelled" });
  });

  it("falls back to clipboard when navigator.share is missing", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ clipboard: { writeText } });
    const result = await performShare(coords);
    expect(result).toEqual({ kind: "copied" });
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("#/audit/facebook/react"),
    );
  });

  it("falls back to clipboard when navigator.share fails non-Abort", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({
      share: vi.fn().mockRejectedValue(new Error("boom")),
      clipboard: { writeText },
    });
    const result = await performShare(coords);
    expect(result).toEqual({ kind: "copied" });
  });

  it("returns 'error' when clipboard rejects", async () => {
    stubNavigator({
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });
    const result = await performShare(coords);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.message).toContain("denied");
    }
  });

  it("returns 'unavailable' when neither API exists", async () => {
    stubNavigator({});
    const result = await performShare(coords);
    expect(result).toEqual({ kind: "unavailable" });
  });
});
