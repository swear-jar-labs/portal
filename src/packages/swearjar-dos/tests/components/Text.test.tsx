import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DOS_ROLE_ATTR } from "../../attributes";
import { Text } from "../../components/Text/Text";

describe("Text", () => {
  it("stamps the body role by default", () => {
    const html = renderToStaticMarkup(<Text>body</Text>);
    expect(html).toContain(`<p ${DOS_ROLE_ATTR}="body"`);
  });

  it("stamps the given role", () => {
    const html = renderToStaticMarkup(<Text role="hint">hint</Text>);
    expect(html).toContain(`${DOS_ROLE_ATTR}="hint"`);
  });

  it("keeps the tone color for content text on the default body role", () => {
    const html = renderToStaticMarkup(<Text tone="cyan">content</Text>);
    expect(html).toContain(`${DOS_ROLE_ATTR}="body"`);
    expect(html).toContain("--dos-tone-cyan");
  });

  it("keeps role and tone mutually exclusive", () => {
    // The typecheck gate owns this assertion: a compile error is the expected
    // outcome, so the directive fails the build if the union stops forbidding it.
    // @ts-expect-error role and tone are mutually exclusive
    const mixed = createElement(Text, { role: "accent", tone: "cyan" }, "mixed");
    expect(renderToStaticMarkup(mixed)).toContain("mixed");
  });
});
