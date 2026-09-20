import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DOS_ROW_ATTR, DOS_SCROLL_ATTR } from "../../attributes";
import { Table, type TableColumn } from "../../components/Table/Table";

type Row = { key: string; title: string };

const columns: TableColumn<Row>[] = [
  {
    id: "key",
    label: "KEY",
    action: (row) => ({
      id: `row-${row.key}`,
      content: row.key,
      href: `/tickets/${row.key}`,
      rowActivation: true,
    }),
  },
  { id: "title", label: "TITLE", render: (row) => row.title },
];

describe("Table", () => {
  it("renders an explicit primary control and a navigation row", () => {
    const html = renderToStaticMarkup(
      <Table
        columns={columns}
        items={[{ key: "DOS-3", title: "FileTable contract" }]}
        rowKey={(row) => row.key}
        rowAttribute="data-ticket-row"
        label="Tickets"
      />,
    );

    expect(html).toContain(`${DOS_ROW_ATTR}=""`);
    expect(html).toContain('data-ticket-row=""');
    expect(html).toContain('id="row-DOS-3"');
    expect(html).toContain('href="/tickets/DOS-3"');
    expect(html).toContain(">DOS-3</a>");
    expect(html).not.toContain(`${DOS_SCROLL_ATTR}=""`);
  });

  it("only creates a nested keyboard boundary when the consumer requests one", () => {
    const html = renderToStaticMarkup(
      <Table
        columns={columns}
        items={[{ key: "DOS-3", title: "FileTable contract" }]}
        rowKey={(row) => row.key}
        navigationBoundary
      />,
    );

    expect(html).toContain(`${DOS_SCROLL_ATTR}=""`);
  });
});
