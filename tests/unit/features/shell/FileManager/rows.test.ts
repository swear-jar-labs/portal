import { describe, expect, it } from "vitest";
import type { FileGroup } from "@/content/commands";
import {
  buildRowIds,
  DIR_ROW_PREFIX,
  fallbackRowId,
  FILE_ROW_PREFIX,
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
    items: [{ command: "FORUM", name: "FORUM", ext: "EXE", size: 2048 }],
  },
];

describe("buildRowIds", () => {
  it("keeps dir rows and their files in group order", () => {
    expect(buildRowIds(groups, [])).toEqual([
      `${DIR_ROW_PREFIX}read`,
      `${FILE_ROW_PREFIX}ABOUT`,
      `${FILE_ROW_PREFIX}RULES`,
      `${DIR_ROW_PREFIX}board`,
      `${FILE_ROW_PREFIX}FORUM`,
    ]);
  });

  it("hides files of collapsed groups but keeps the dir row", () => {
    expect(buildRowIds(groups, ["read"])).toEqual([
      `${DIR_ROW_PREFIX}read`,
      `${DIR_ROW_PREFIX}board`,
      `${FILE_ROW_PREFIX}FORUM`,
    ]);
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
