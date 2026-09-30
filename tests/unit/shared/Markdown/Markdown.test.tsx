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

  it("renders a fenced block in the code well with its language class", () => {
    const html = render("```c\nfree(ptr);\n```");
    expect(html).toContain('class="codeBlock"');
    expect(html).toContain('class="code language-c"');
    expect(html).toContain("free(ptr);");
  });

  it("marks inline code", () => {
    expect(render("call `realloc()` first")).toContain('class="code"');
  });

  it("renders a bundled image with its alt text", () => {
    const html = render("![The first computer bug](/media/bug-1947.jpg)");
    expect(html).toContain('src="/media/bug-1947.jpg"');
    expect(html).toContain('alt="The first computer bug"');
  });

  it("sends no referrer with images (anti-hotlink hosts serve an empty one)", () => {
    expect(render("![x](https://example.com/y.jpg)")).toContain('referrerPolicy="no-referrer"');
  });

  it("drops unsafe image protocols", () => {
    expect(render("![x](javascript:alert(1))")).not.toContain("javascript:");
    expect(render("![x](data:image/svg+xml,<svg/>)")).not.toContain("data:image");
  });

  it("keeps blob image sources for the editor upload imitation", () => {
    const html = render("![picked](blob:mock-object-url)");
    expect(html).toContain('src="blob:mock-object-url"');
    expect(html).toContain('alt="picked"');
  });

  it("renders angle-bracketed image destinations with spaces", () => {
    const html = render("![](<https://example.com/a b.jpg>)");
    expect(html).toContain('src="https://example.com/a%20b.jpg"');
  });
});

describe("Markdown mentions", () => {
  const renderMentions = (source: string, mentionUsers: readonly string[] = ["ada", "grace"]) =>
    renderToStaticMarkup(<Markdown mentionUsers={mentionUsers}>{source}</Markdown>);

  it("links resolved handles to the member route", () => {
    const html = renderMentions("ping @Ada, see this");
    expect(html).toContain('href="/members/ada"');
    expect(html).toContain("@Ada");
  });

  it("leaves text plain without resolved handles", () => {
    expect(render("ping @ada")).not.toContain("/members/ada");
    expect(renderMentions("ping @ada", [])).not.toContain("/members/ada");
  });

  it("leaves unknown handles plain even with a directory", () => {
    const html = renderMentions("ping @nobody");
    expect(html).toContain("@nobody");
    expect(html).not.toContain("/members/nobody");
  });

  it("does not tag emails or code", () => {
    expect(renderMentions("mail ada@x.io")).not.toContain("/members/");
    expect(renderMentions("run `@ada` first")).not.toContain("/members/ada");
    expect(renderMentions("```\n@ada\n```")).not.toContain("/members/ada");
  });

  it("does not nest a mention inside a real link", () => {
    const html = renderMentions("[@ada](https://example.com)");
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain("/members/ada");
  });
});
