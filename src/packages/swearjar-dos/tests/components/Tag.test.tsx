import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Tag } from "../../components/Tag/Tag";

describe("Tag", () => {
  it("exposes native disabled state on an unavailable toggle", () => {
    const html = renderToStaticMarkup(
      <Tag disabled onClick={() => {}}>
        ops
      </Tag>,
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-pressed="false"');
  });

  it("renders a plain span without a click handler", () => {
    const html = renderToStaticMarkup(<Tag tone="cyan">proposal</Tag>);
    expect(html).toContain("<span");
    expect(html).not.toContain("<button");
    expect(html).toContain("--dos-tone-cyan");
  });

  it("renders a toggle button when clickable", () => {
    const html = renderToStaticMarkup(<Tag onClick={() => {}}>ops</Tag>);
    expect(html).toContain('<button type="button"');
    expect(html).toContain('aria-pressed="false"');
  });

  it("marks the pressed filter and drops the tone color for the fixed pair", () => {
    const html = renderToStaticMarkup(
      <Tag tone="red" active onClick={() => {}}>
        ops
      </Tag>,
    );
    expect(html).toContain('class="tag button active"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("--dos-tone-red");
  });

  it("names a button whose press does more than its text says", () => {
    const html = renderToStaticMarkup(
      <Tag ariaLabel="Remove ops" onClick={() => {}}>
        ops
      </Tag>,
    );
    expect(html).toContain('aria-label="Remove ops"');
  });
});
