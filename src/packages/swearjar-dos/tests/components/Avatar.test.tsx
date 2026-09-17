import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Avatar } from "../../components/Avatar/Avatar";

describe("Avatar", () => {
  it("renders the first letter on a deterministic color square", () => {
    const ada = renderToStaticMarkup(<Avatar user="ada" />);
    expect(ada).toContain(">A</span>");
    expect(ada).toContain("background:var(--dos-light-cyan)");

    // A different user gets a different square color (same user stays stable).
    const grace = renderToStaticMarkup(<Avatar user="grace" />);
    expect(grace).toContain(">G</span>");
    expect(grace).toContain("background:var(--dos-light-red)");
    expect(renderToStaticMarkup(<Avatar user="ada" />)).toBe(ada);
  });

  it("renders the picture when the user has one", () => {
    const html = renderToStaticMarkup(<Avatar user="ada" src="/avatars/ada.svg" />);
    expect(html).toContain('<img class="image" src="/avatars/ada.svg" alt=""/>');
    expect(html).not.toContain(">A</span>");
  });

  it("is decorative: the name always sits next to it", () => {
    const html = renderToStaticMarkup(<Avatar user="ada" />);
    expect(html).toContain('aria-hidden="true"');
  });

  it("carries the size variant", () => {
    expect(renderToStaticMarkup(<Avatar user="ada" />)).toContain('class="avatar sm"');
    expect(renderToStaticMarkup(<Avatar user="ada" size="lg" />)).toContain('class="avatar lg"');
  });
});
