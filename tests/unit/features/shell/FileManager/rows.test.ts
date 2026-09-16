import { describe, expect, it } from "vitest";
import type { FileGroup } from "@/content/commands";
import {
  buildRowIds,
  DIR_ROW_PREFIX,
  fallbackRowId,
  FILE_ROW_PREFIX,
  nextRowId,
} from "@/features/shell/FileManager/rows";

const groups: FileGroup[] = [
  {
    id: "read",
    label: "── READ ──",
    short: "READ",
    items: [
      { command: "ABOUT", name: "ABOUT", ext: "TXT", size: 1024 },
      { command: "RULES", name: "RULES", ext: "TXT", size: 640 },
    ],
  },
  {
    id: "board",
    label: "── BOARD ──",
    short: "BOARD",
    items: [{ command: "DISCUSSIONS", name: "DISCUSSIONS", ext: "EXE", size: 2048 }],
  },
];

describe("buildRowIds", () => {
  it("keeps dir rows and their files in group order", () => {
    expect(buildRowIds(groups, [])).toEqual([
      `${DIR_ROW_PREFIX}read`,
      `${FILE_ROW_PREFIX}ABOUT`,
      `${FILE_ROW_PREFIX}RULES`,
      `${DIR_ROW_PREFIX}board`,
      `${FILE_ROW_PREFIX}DISCUSSIONS`,
    ]);
  });

  it("hides files of collapsed groups but keeps the dir row", () => {
    expect(buildRowIds(groups, ["read"])).toEqual([
      `${DIR_ROW_PREFIX}read`,
      `${DIR_ROW_PREFIX}board`,
      `${FILE_ROW_PREFIX}DISCUSSIONS`,
    ]);
  });
});

describe("nextRowId", () => {
  const rowIds = ["a", "b", "c"];

  it("moves down and up", () => {
    expect(nextRowId(rowIds, "a", "down")).toBe("b");
    expect(nextRowId(rowIds, "b", "up")).toBe("a");
  });

  it("wraps around both ends", () => {
    expect(nextRowId(rowIds, "c", "down")).toBe("a");
    expect(nextRowId(rowIds, "a", "up")).toBe("c");
  });

  it("continues from the ends when the cursor is unknown", () => {
    expect(nextRowId(rowIds, "missing", "down")).toBe("b");
    expect(nextRowId(rowIds, "missing", "up")).toBe("c");
  });

  it("returns undefined for an empty list", () => {
    expect(nextRowId([], "a", "down")).toBeUndefined();
  });
});

describe("fallbackRowId", () => {
  const fallbackRowIds = ["dir-read", "file-ABOUT", "file-RULES"];
  const defaultRowId = "file-ABOUT";

  it("prefers the displayed document row", () => {
    expect(fallbackRowId(fallbackRowIds, "file-RULES", defaultRowId)).toBe("file-RULES");
  });

  it("falls back to the default when the document row is hidden", () => {
    expect(fallbackRowId(["dir-read", "file-ABOUT"], "file-RULES", defaultRowId)).toBe(
      "file-ABOUT",
    );
    expect(fallbackRowId(fallbackRowIds, undefined, defaultRowId)).toBe("file-ABOUT");
  });

  it("falls back to the first row when the default is hidden too", () => {
    expect(fallbackRowId(["dir-read"], "file-RULES", defaultRowId)).toBe("dir-read");
  });

  it("returns the default for an empty list", () => {
    expect(fallbackRowId([], undefined, defaultRowId)).toBe(defaultRowId);
  });
});
