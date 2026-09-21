import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RemoveButton } from "../../components/RemoveButton/RemoveButton";

describe("RemoveButton", () => {
  it("renders the ghost remove glyph with the caller name", () => {
    const html = renderToStaticMarkup(
      <RemoveButton ariaLabel="Remove blocker CMP-1" onClick={() => {}} />,
    );
    expect(html).toContain("[×]");
    expect(html).toContain('aria-label="Remove blocker CMP-1"');
  });
});
