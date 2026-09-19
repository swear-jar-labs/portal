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
});
