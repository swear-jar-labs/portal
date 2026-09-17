// Rows of focusables for the shell's two-axis panel walk: controls sharing a
// marked row stay together in DOM order, an unmarked control is a row of its
// own — pages without row markup keep the flat ↑/↓ walk.
export type ControlRow<T> = {
  // The row element, or the control itself when nothing is marked.
  key: object;
  cells: T[];
};

export function groupControlRows<T extends object>(
  items: readonly T[],
  rowOf: (item: T) => object | null,
): ControlRow<T>[] {
  const rows = new Map<object, ControlRow<T>>();
  for (const item of items) {
    const key = rowOf(item) ?? item;
    const row = rows.get(key);
    if (row) row.cells.push(item);
    else rows.set(key, { key, cells: [item] });
  }
  return Array.from(rows.values());
}
