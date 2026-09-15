import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Select } from "../../components/Select/Select";

const OPTIONS = [
  { value: "learner", label: "Learner" },
  { value: "reviewer", label: "Reviewer" },
];

describe("Select", () => {
  it("renders a closed combobox trigger with the current option", () => {
    const html = renderToStaticMarkup(
      <Select label="Role" name="role" value="reviewer" onChange={() => {}} options={OPTIONS} />,
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Reviewer");
    expect(html).not.toContain('role="listbox"');
  });

  it("associates the label with the trigger", () => {
    const html = renderToStaticMarkup(
      <Select label="Role" name="role" value="learner" onChange={() => {}} options={OPTIONS} />,
    );
    const labelled = html.match(/<label[^>]*for="([^"]+)"/);
    expect(labelled?.[1]).toBeDefined();
    expect(html).toMatch(/<label[^>]*for="[^"]+"[^>]*>Role<\/label>/);
    expect(html).toContain(`id="${labelled?.[1]}"`);
  });

  it("submits the value through a named input", () => {
    const html = renderToStaticMarkup(
      <Select label="Role" name="role" value="learner" onChange={() => {}} options={OPTIONS} />,
    );
    expect(html).toContain('type="hidden"');
    expect(html).toMatch(/name="role"/);
    expect(html).toMatch(/value="learner"/);
  });

  it("marks and describes an errored trigger", () => {
    const html = renderToStaticMarkup(
      <Select
        label="Role"
        name="role"
        value="learner"
        onChange={() => {}}
        options={OPTIONS}
        error="Required"
      />,
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toMatch(/aria-describedby="[^"]+"/);
    expect(html).toContain("Required");
  });
});
