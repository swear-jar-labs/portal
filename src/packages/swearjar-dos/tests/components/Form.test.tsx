import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Form } from "../../components/Form/Form";

describe("Form", () => {
  it("renders a native form with an accessible name and custom validation", () => {
    const html = renderToStaticMarkup(
      <Form onSubmit={() => {}} ariaLabel="Apply">
        <span>fields</span>
      </Form>,
    );
    expect(html).toContain("<form");
    expect(html).toContain('aria-label="Apply"');
    expect(html.toLowerCase()).toContain("novalidate");
    expect(html).toContain("<span>fields</span>");
  });
});
