import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Link } from "../../components/Link/Link";

describe("Link", () => {
  it("marks a download target", () => {
    const html = renderToStaticMarkup(
      <Link href="blob:mock/1" download="snippet.c">
        snippet.c
      </Link>,
    );
    expect(html).toContain('download="snippet.c"');
    expect(html).not.toContain("target=");
  });

  it("opens external links in a new tab", () => {
    const html = renderToStaticMarkup(
      <Link href="https://example.com" external>
        example
      </Link>,
    );
    expect(html).toContain('target="_blank"');
    expect(html).not.toContain("download=");
  });
});
