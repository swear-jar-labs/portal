import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FileTable, type FileTableColumn } from "../../components/FileTable/FileTable";

const COLUMNS: FileTableColumn[] = [
  { id: "name", label: "Name" },
  { id: "type", label: "Type" },
  { id: "size", label: "Size", align: "right" },
];

describe("FileTable", () => {
  it("indents files under their expanded directory", () => {
    const html = renderToStaticMarkup(
      <FileTable
        columns={COLUMNS}
        items={[
          { id: "dir-read", name: "READ", type: "DIR", kind: "dir", expanded: true },
          { id: "file-about", name: "ABOUT", type: "TXT", nested: true },
        ]}
      />,
    );

    expect(html).toContain('class="row rowAction dir"');
    expect(html).toContain('class="row rowAction nested"');
  });

  it("replaces the default sprite with a section-owned icon node", () => {
    const html = renderToStaticMarkup(
      <FileTable
        columns={COLUMNS}
        items={[
          {
            id: "file-inbox",
            name: "INBOX",
            type: "EXE",
            kind: "exe",
            icon: "mail",
            iconNode: <span data-marked="true" />,
          },
        ]}
      />,
    );

    expect(html).toContain('data-marked="true"');
    expect(html).not.toContain('data-file-icon="mail"');
  });

  it("keeps the file name as the primary row control", () => {
    const html = renderToStaticMarkup(
      <FileTable
        columns={COLUMNS}
        items={[{ id: "file-about", name: "ABOUT", type: "TXT", href: "/about" }]}
      />,
    );

    expect(html).toContain('id="file-about"');
    expect(html).toContain('href="/about"');
    expect(html).toContain(">ABOUT</span>");
    expect(html).toContain('class="wrap fill"');
  });
});
