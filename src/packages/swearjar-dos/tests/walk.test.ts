import { describe, expect, it } from "vitest";
import { groupControlRows } from "../walk";

type Cell = { id: string };
type Row = { id: string };

const cell = (id: string): Cell => ({ id });

describe("groupControlRows", () => {
  it("keeps controls in DOM order", () => {
    const rows = groupControlRows([cell("a"), cell("b"), cell("c")], () => null);
    expect(rows.map((row) => row.cells.map((entry) => entry.id))).toEqual([["a"], ["b"], ["c"]]);
  });

  it("makes an unmarked control a row of its own", () => {
    const row: Row = { id: "r" };
    const rows = groupControlRows([cell("a"), cell("b")], (entry) =>
      entry.id === "b" ? row : null,
    );
    expect(rows).toHaveLength(2);
    expect(rows[1]?.key).toBe(row);
    expect(rows[1]?.cells.map((entry) => entry.id)).toEqual(["b"]);
  });

  it("collects the controls of one row in their DOM order", () => {
    const row: Row = { id: "r" };
    const rows = groupControlRows([cell("a"), cell("b"), cell("c")], (entry) =>
      entry.id === "b" ? null : row,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.cells.map((entry) => entry.id)).toEqual(["a", "c"]);
  });

  it("lets a focusable row element lead its own row", () => {
    const post = cell("post");
    const link = cell("link");
    const rows = groupControlRows([post, link], (entry) => (entry.id === "link" ? post : entry));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.key).toBe(post);
    expect(rows[0]?.cells).toEqual([post, link]);
  });
});
