import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComboBox } from "../../components/ComboBox/ComboBox";

const OPTIONS = [
  { value: "CMP-1", label: "CMP-1", hint: "First pass" },
  { value: "CMP-2", label: "CMP-2", hint: "Pretty printer" },
];

describe("ComboBox", () => {
  it("renders a closed combobox box with the current text", () => {
    const html = renderToStaticMarkup(
      <ComboBox
        label="Ticket key"
        name="key"
        value="CMP-"
        onChange={() => {}}
        options={OPTIONS}
        emptyText="No tickets match."
      />,
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('value="CMP-"');
    expect(html).toContain('name="key"');
    expect(html).not.toContain('role="listbox"');
  });

  it("associates the label with the box", () => {
    const html = renderToStaticMarkup(
      <ComboBox
        label="Ticket key"
        name="key"
        value=""
        onChange={() => {}}
        options={OPTIONS}
        emptyText="No tickets match."
      />,
    );
    const labelled = html.match(/<label[^>]*for="([^"]+)"[^>]*>Ticket key<\/label>/);
    expect(labelled?.[1]).toBeDefined();
    expect(html).toContain(`id="${labelled?.[1]}"`);
  });

  it("marks and describes an errored box", () => {
    const html = renderToStaticMarkup(
      <ComboBox
        label="Ticket key"
        name="key"
        value=""
        onChange={() => {}}
        options={OPTIONS}
        emptyText="No tickets match."
        error="Required"
      />,
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toMatch(/aria-describedby="[^"]+"/);
    expect(html).toContain("Required");
  });
});
