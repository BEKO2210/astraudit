/**
 * Smoke tests for the <Skeleton /> primitive.
 *
 * The component is purely structural so the assertions focus on the
 * accessibility contract — every research-backed skeleton-loader
 * recommendation calls these out specifically.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Skeleton } from "../../src/components/Skeleton";

beforeAll(() => {
  // react-dom/server complains without document/window stubs in node.
});

afterAll(() => {
  /* no-op */
});

describe("<Skeleton />", () => {
  it("renders a div by default with the shimmer class", () => {
    const html = renderToStaticMarkup(<Skeleton className="h-4 w-20" />);
    expect(html.startsWith("<div")).toBe(true);
    expect(html).toContain("skeleton-shimmer");
    expect(html).toContain("h-4 w-20");
  });

  it("renders a span when inline=true", () => {
    const html = renderToStaticMarkup(<Skeleton inline className="w-2" />);
    expect(html.startsWith("<span")).toBe(true);
    expect(html).toContain("inline-block");
  });

  it("is aria-hidden by default so screen readers stay quiet", () => {
    const html = renderToStaticMarkup(<Skeleton />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role=');
  });

  it("becomes role=img with an aria-label when label is provided", () => {
    const html = renderToStaticMarkup(<Skeleton label="Loading score" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Loading score"');
    // When labeled it must NOT also be aria-hidden, otherwise the
    // label would be unreachable.
    expect(html).not.toContain('aria-hidden');
  });
});
