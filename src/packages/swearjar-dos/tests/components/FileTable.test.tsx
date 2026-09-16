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

    expect(html).toContain('<tr class="row dir">');
    expect(html).toContain('<tr class="row nested">');
  });
});
