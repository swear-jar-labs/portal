import type { FileGroup } from "@/content/commands";

export const FILE_ROW_PREFIX = "file-";
export const DIR_ROW_PREFIX = "dir-";

export function fileRowId(commandId: string): string {
  return `${FILE_ROW_PREFIX}${commandId}`;
}

export function dirRowId(groupId: string): string {
  return `${DIR_ROW_PREFIX}${groupId}`;
}

export function buildRowIds(
  fileGroups: readonly FileGroup[],
  collapsedGroups: readonly string[],
): string[] {
  const ids: string[] = [];
  for (const group of fileGroups) {
    ids.push(dirRowId(group.id));
    if (collapsedGroups.includes(group.id)) continue;
    for (const item of group.items) ids.push(fileRowId(item.command));
  }
  return ids;
}

export function nextRowId(
  rowIds: readonly string[],
  cursorId: string,
  direction: "up" | "down",
): string | undefined {
  if (rowIds.length === 0) return undefined;
  const step = direction === "down" ? 1 : -1;
  const current = rowIds.indexOf(cursorId);
  const start = current === -1 ? 0 : current;
  const next = (start + step + rowIds.length) % rowIds.length;
  return rowIds[next];
}

// The stored cursor row can disappear (session swap, collapsed folder).
// Preference order: the displayed document's row, the boot default, the first row.
export function fallbackRowId(
  rowIds: readonly string[],
  docRowId: string | undefined,
  defaultRowId: string,
): string {
  if (docRowId && rowIds.includes(docRowId)) return docRowId;
  if (rowIds.includes(defaultRowId)) return defaultRowId;
  return rowIds[0] ?? defaultRowId;
}
