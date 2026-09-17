import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Stack } from "../../components/Stack/Stack";

describe("Stack", () => {
  it("stamps the navigation-row mark only when asked", () => {
    expect(renderToStaticMarkup(<Stack navRow>content</Stack>)).toContain("data-dos-row");
    expect(renderToStaticMarkup(<Stack>content</Stack>)).not.toContain("data-dos-row");
  });

  it("carries the focusable row contract", () => {
    const html = renderToStaticMarkup(
      <Stack as="article" navRow tabIndex={0}>
        post
      </Stack>,
    );
    expect(html).toContain("<article");
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("data-dos-row");
  });
});
