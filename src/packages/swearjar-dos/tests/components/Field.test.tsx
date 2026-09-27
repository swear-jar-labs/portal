import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Field } from "../../components/Field/Field";

describe("Field", () => {
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
