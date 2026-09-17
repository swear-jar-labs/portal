import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { List } from "../../components/List/List";

const css = readFileSync(new URL("../../components/List/List.module.css", import.meta.url), "utf8");

describe("List", () => {
  it("renders ordered and unordered lists from items", () => {
    const unordered = renderToStaticMarkup(<List items={["one", "two"]} />);
    expect(unordered).toContain('<ul class="list">');
    expect(unordered.match(/<li/g)).toHaveLength(2);

    const ordered = renderToStaticMarkup(<List ordered items={["one", "two"]} />);
    expect(ordered).toContain('<ol class="list ordered">');
    expect(ordered.match(/<li/g)).toHaveLength(2);
  });

  it("drops markers and their reserve when marker is off", () => {
    const html = renderToStaticMarkup(<List marker={false} items={["one"]} />);
    expect(html).toContain("noMarker");
  });

  it("keeps markers in the text flow, not absolutely positioned over fixed padding", () => {
    // Regression (board thread post, 2026-09-17): the ordered counter "1. " is
    // wider than the "> " bullet, so a fixed padding-left with an absolute
    // marker let the numbers overlap the text.
    expect(css).not.toMatch(/position:\s*absolute/);
    expect(css).toContain("counter(dos-list)");
    expect(css).toContain("var(--dos-tone-green)");
  });
});
