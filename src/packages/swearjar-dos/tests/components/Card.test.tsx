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
    expect(html).toContain('class="link"');
  });

  it("renders a button title when the card has no route", () => {
    const html = render({ id: "thread-1", title: "Composed here", onActivate: () => {} });
    expect(html).toContain('<button type="button" id="thread-1"');
    expect(html).toContain(">Composed here</button>");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("href=");
  });

  it("does not type-check a title with neither a route nor a handler", () => {
    // The typecheck gate owns this assertion: a button title without a handler
    // would be a dead control, so the union requires one. The directive fails
    // the build if the requirement disappears.
    // @ts-expect-error a card without href needs onActivate
    render({ title: "Dead card" });
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

  it("can place metadata before the title for a feed byline", () => {
    const html = render({
      title: "Topic",
      href: "/discussions/1",
      meta: "ada",
      metaPosition: "before",
    });
    expect(html).toMatch(/ada[\s\S]*Topic/);
  });

  it("keeps metadata after the title by default", () => {
    const html = render({ title: "Topic", href: "/discussions/1", meta: "ada" });
    expect(html).toMatch(/Topic[\s\S]*ada/);
  });
});
