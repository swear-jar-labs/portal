import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Textarea } from "../../components/Textarea/Textarea";

describe("Textarea", () => {
  it("associates the label with the control", () => {
    const html = renderToStaticMarkup(
      <Textarea
        label="Motivation"
        name="motivation"
        value="because"
        onChange={() => {}}
        rows={5}
        required
      />,
    );
    expect(html).toContain("<textarea");
    expect(html).toContain('rows="5"');
    expect(html).toContain("required");
    expect(html).toMatch(/<label[^>]*for="[^"]+"[^>]*>Motivation<\/label>/);
    expect(html).toMatch(/<textarea[^>]*id="[^"]+"/);
  });

  it("marks and describes an errored control", () => {
    const html = renderToStaticMarkup(
      <Textarea
        label="Motivation"
        name="motivation"
        value=""
        onChange={() => {}}
        error="Required"
      />,
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toMatch(/aria-describedby="[^"]+"/);
    expect(html).toContain("Required");
  });

  it("can take the caret when it opens (inline editors)", () => {
    const html = renderToStaticMarkup(
      <Textarea label="Edit" name="edit" value="text" onChange={() => {}} autoFocus />,
    );
    expect(html).toContain("autofocus");
  });

  it("grows with its text when asked", () => {
    const html = renderToStaticMarkup(
      <Textarea label="Body" name="body" value="text" onChange={() => {}} rows={3} autoGrow />,
    );
    expect(html).toMatch(/class="[^"]*\bgrow\b/);
    expect(html).toContain("min-height:calc(3lh)");
  });
});
