import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Field } from "../../components/Field/Field";

describe("Field", () => {
  it("uses a provided id for the input, label and error association", () => {
    const html = renderToStaticMarkup(
      <Field
        id="section-search"
        label="SEARCH"
        name="q"
        value=""
        onChange={() => {}}
        error="Try another query"
      />,
    );
    expect(html).toContain('for="section-search"');
    expect(html).toContain('id="section-search"');
    expect(html).toContain('aria-describedby="section-search-error"');
    expect(html).toContain('id="section-search-error"');
  });
  it("associates the label with the control", () => {
    const html = renderToStaticMarkup(
      <Field label="SEARCH" name="q" value="" onChange={() => {}} />,
    );
    expect(html).toMatch(/<label[^>]*for="[^"]+"[^>]*>SEARCH<\/label>/);
    expect(html).toMatch(/<input[^>]*id="[^"]+"[^>]*name="q"/);
  });

  it("hides the label visually without dropping the association", () => {
    const html = renderToStaticMarkup(
      <Field label="SEARCH" name="q" value="" onChange={() => {}} hideLabel />,
    );
    expect(html).toMatch(/<label[^>]*for="[^"]+"[^>]*>SEARCH<\/label>/);
    expect(html).toContain("visuallyHidden");
  });
});
