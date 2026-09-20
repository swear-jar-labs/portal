import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "../../components/Button/Button";

describe("Button", () => {
  it("exposes toggle state when asked", () => {
    const html = renderToStaticMarkup(
      <Button ariaPressed ariaLabel="Preview">
        {"[ PREVIEW ]"}
      </Button>,
    );
    expect(html).toContain('aria-pressed="true"');
  });

  it("omits toggle state by default", () => {
    const html = renderToStaticMarkup(<Button>{"[ SAVE ]"}</Button>);
    expect(html).not.toContain("aria-pressed");
  });

  it("uses the same variants for links", () => {
    const html = renderToStaticMarkup(
      <Button href="/tickets?project=compiler&new=1" variant="primary">
        [ NEW TICKET ]
      </Button>,
    );

    expect(html).toContain('<a href="/tickets?project=compiler&amp;new=1"');
    expect(html).toContain('class="button primary"');
  });
});
