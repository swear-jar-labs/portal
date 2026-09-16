import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DOS_ROLE_ATTR } from "../../attributes";
import { Heading } from "../../components/Heading/Heading";

describe("Heading", () => {
  it("stamps the heading role and the level scale class", () => {
    const html = renderToStaticMarkup(<Heading level={1}>Title</Heading>);
    expect(html).toContain("<h1");
    expect(html).toContain(`${DOS_ROLE_ATTR}="heading"`);
    expect(html).toContain('class="heading level1"');
  });

  it("defaults to level 2", () => {
    const html = renderToStaticMarkup(<Heading>Title</Heading>);
    expect(html).toContain("<h2");
    expect(html).toContain('class="heading level2"');
  });
});
