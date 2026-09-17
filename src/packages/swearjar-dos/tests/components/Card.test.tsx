import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Card } from "../../components/Card/Card";

const render = (props: Parameters<typeof Card>[0]) => renderToStaticMarkup(<Card {...props} />);

describe("Card", () => {
  it("wraps the title link in a heading", () => {
    const html = render({ title: "Hello", href: "/discussions/1" });
    expect(html).toContain('<article class="card"');
    expect(html).toContain("<h3");
    expect(html).toContain('href="/discussions/1"');
    expect(html).toContain(">Hello</a>");
  });

  it("carries the focus-return id and marks the open card as current", () => {
    const html = render({ id: "thread-1", title: "Hello", href: "/discussions/1", current: true });
    expect(html).toContain('id="thread-1"');
    expect(html).toContain('aria-current="true"');
    expect(html).toContain("card current");
  });

  it("renders leading markers, meta and actions slots", () => {
    const html = render({
      title: "Hello",
      href: "/discussions/1",
      leading: "* PINNED",
      meta: "ada",
      actions: "tags",
    });
    expect(html).toContain("leading");
    expect(html).toContain("* PINNED");
    expect(html).toContain("meta");
    expect(html).toContain("ada");
    expect(html).toContain("actions");
    expect(html).toContain("tags");
  });
});
