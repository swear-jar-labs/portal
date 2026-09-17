import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/shared/Markdown/Markdown";

const render = (source: string) => renderToStaticMarkup(<Markdown>{source}</Markdown>);

describe("Markdown pipeline", () => {
  it("renders tone directives as kit tone spans", () => {
    const html = render(":cyan[hello]");
    expect(html).toContain("--dos-tone-cyan");
    expect(html).toContain(">hello</span>");
  });

  it("keeps bold inside a tone directive", () => {
    const html = render(":yellow[**jar**]");
    expect(html).toContain("--dos-tone-yellow");
    expect(html).toContain("<strong");
  });

  it("aligns a block when the directive fills it", () => {
    expect(render(':cyan[sig]{align="right"}')).toMatch(/class="[^"]*\bright\b/);
    expect(render('## :yellow[Head]{align="center"}')).toMatch(/class="[^"]*\bcenter\b/);
  });

  it("ignores alignment on a directive inside running text", () => {
    expect(render('word :cyan[tail]{align="right"} more')).not.toMatch(/class="[^"]*\bright\b/);
  });

  it("degrades unknown directives to their content", () => {
    const html = render(":chartreuse[plain]");
    expect(html).toContain("plain");
    expect(html).not.toContain("<span");
  });

  it("renders GFM strikethrough", () => {
    expect(render("~~gone~~")).toContain("<del>");
  });

  it("does not turn whitespace between list items into items", () => {
    const html = render("- one\n- two");
    expect(html.match(/<li/g) ?? []).toHaveLength(2);
  });

  it("strips script blocks", () => {
    expect(render("<script>alert(1)</script>")).not.toContain("<script");
  });

  it("keeps inline raw HTML as text", () => {
    const html = render("hello <b>world</b>");
    expect(html).not.toContain("<b>");
    expect(html).toContain("hello");
  });

  it("drops unsafe link protocols", () => {
    const html = render("[x](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });
});
