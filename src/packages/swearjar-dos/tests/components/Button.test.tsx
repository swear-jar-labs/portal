import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "../../components/Button/Button";

describe("Button", () => {
  it("uses the same variants for links", () => {
    const html = renderToStaticMarkup(
      <Button href="/tickets?project=compiler&new=1" variant="primary">
        [ NEW TICKET ]
      </Button>,
    );

    expect(html).toContain('<a href="/tickets?project=compiler&amp;new=1"');
    expect(html).toContain('class="button primary"');
  });

  it("passes the download name through on links", () => {
    const html = renderToStaticMarkup(
      <Button href="blob:mock/file" download="snippet.c">
        [ DOWNLOAD ]
      </Button>,
    );
    expect(html).toContain('download="snippet.c"');
  });
});
