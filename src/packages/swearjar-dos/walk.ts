"use client";

// The kit's arrow-navigation model, shared by the shell's panel walk and the
// kit's Dialog: one hook for both regions. A region with at least one marked
// row (Stack navRow) walks ↑/↓ between rows and ←/→ between the controls of
// the current row; a region without row markup is a flat list, where all four
// arrows step through the controls in DOM order. A step that starts outside
// the visible area (or without a current control) enters from the edge in the
// direction of travel. The region resolver is the consumer's policy (the shell
// filters by zone, Dialog returns its window body): zones, gates and closing
// stay outside.

import { useEffect } from "react";
import { DOS_ROW_ATTR, DOS_ROW_PRIMARY_ATTR } from "./attributes";
import { FOCUSABLE_SELECTOR, isInScrollView, nextControlIndex, nextStepIndex } from "./focus";
import { hasCommandModifier, shouldSkipEvent } from "./keyboard";

// Rows of focusables for the two-axis walk: controls sharing a marked row stay
// together in DOM order, an unmarked control is a row of its own — pages
// without row markup keep the flat walk.
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

const ROW_SELECTOR = `[${DOS_ROW_ATTR}]`;
// An open combobox owns its keyboard until it closes.
const OPEN_COMBOBOX_SELECTOR = '[aria-expanded="true"]';

// Key → step tables: ↑/↓ walk the row axis, ←/→ the cell axis.
const ROW_STEP_BY_KEY: Record<string, 1 | -1> = { ArrowDown: 1, ArrowUp: -1 };
const CELL_STEP_BY_KEY: Record<string, 1 | -1> = { ArrowRight: 1, ArrowLeft: -1 };

// Shift+↑/↓ scrolls the region by one step: pressing scrolls once, holding
// keeps scrolling (repeat is fine for a scroll gesture).
const SCROLL_STEP_PX = 60;

type WalkStep = 1 | -1;

export type ControlWalkOptions = {
  // The region the event belongs to: the panel body for a target inside the
  // doc zone, the dialog body inside a modal — null means the event is not
  // ours and the arrows stay native.
  region: (target: Element) => Element | null;
  enabled?: boolean;
};

// The row walk: rows in DOM order with wrap-around; a row out of sight (or no
// current row) enters the visible area from its edge — a scrolled list never
// snaps back to its first row. The sight of a row is the sight of the control
// the step focuses, not of the whole row box. The control the walk left a row
// from is remembered, so a step back into the row lands on it again.
function stepRows(
  rows: readonly ControlRow<HTMLElement>[],
  active: HTMLElement | null,
  step: WalkStep,
  surface: Element,
  rowMemory: WeakMap<object, HTMLElement>,
): HTMLElement | null {
  const rowIndex = active !== null ? rows.findIndex((row) => row.cells.includes(active)) : -1;
  const currentRow = rowIndex >= 0 ? rows[rowIndex] : undefined;
  if (currentRow !== undefined && active !== null) rowMemory.set(currentRow.key, active);

  const nextIndex = nextStepIndex(rows.length, rowIndex, step, (index) => {
    const cells = rows[index]?.cells;
    const cell = cells?.find((item) => item.hasAttribute(DOS_ROW_PRIMARY_ATTR)) ?? cells?.[0];
    return cell !== undefined && isInScrollView(cell, surface);
  });
  const row = rows[nextIndex];
  if (row === undefined) return null;

  const remembered = rowMemory.get(row.key);
  return remembered !== undefined && row.cells.includes(remembered)
    ? remembered
    : (row.cells.find((cell) => cell.hasAttribute(DOS_ROW_PRIMARY_ATTR)) ?? row.cells[0] ?? null);
}

// Enter in a search box steps to the next control on the right, like ArrowRight:
// the cells of the enclosing marked row with the same wrap-around, otherwise
// the next focusable in DOM order without wrapping (a lone field advances to
// its submit row). Returns whether focus moved; a form keeps its native
// submit when it did not.
export function focusNextControl(from: Element): boolean {
  const next = nextControlFrom(from);
  if (next === null) return false;
  next.focus();
  next.scrollIntoView({ block: "nearest" });
  return true;
}

function nextControlFrom(from: Element): HTMLElement | null {
  const row = from.closest(ROW_SELECTOR);
  if (row !== null) {
    const cells = Array.from(row.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (cells.length < 2) return null;
    const current = cells.findIndex((cell) => cell === from);
    return cells[nextControlIndex(cells.length, current, 1)] ?? null;
  }
  const controls = Array.from(from.ownerDocument.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  const current = controls.findIndex((control) => control === from);
  if (current < 0) return null;
  return controls[current + 1] ?? null;
}

// The control a plain arrow hands focus to, or null when the arrow stays
// native: a text field's caret, a one-control row, the bare surface of a
// two-axis region, a region without controls.
function resolveNextControl(
  target: Element,
  surface: Element,
  rowStep: WalkStep | undefined,
  cellStep: WalkStep | undefined,
  rowMemory: WeakMap<object, HTMLElement>,
): HTMLElement | null {
  if (target.closest(OPEN_COMBOBOX_SELECTOR)) return null;

  // Text fields keep their arrows: caret movement and the matching edge.
  if (target instanceof HTMLTextAreaElement) {
    if (rowStep === undefined) return null;
    const atEnd = target.selectionStart === target.value.length;
    const atStart = target.selectionStart === 0;
    if (rowStep === 1 ? !atEnd : !atStart) return null;
  } else if (
    cellStep !== undefined &&
    target instanceof HTMLInputElement &&
    target.type !== "checkbox"
  ) {
    return null;
  }

  const controls = Array.from(surface.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  // A viewer without controls (a document) keeps the arrows native: scroll.
  if (controls.length === 0) return null;

  const rows = groupControlRows(controls, (control) => control.closest(ROW_SELECTOR));
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  // A region with a marked row is two-axis: ←/→ walk the cells of the row the
  // event came from and stay native outside it (cells need a current row).
  if (surface.querySelector(ROW_SELECTOR) !== null) {
    if (rowStep !== undefined) return stepRows(rows, active, rowStep, surface, rowMemory);
    if (cellStep === undefined) return null;
    const row = target.closest(ROW_SELECTOR);
    if (row === null || !surface.contains(row)) return null;
    const cells = rows.find((entry) => entry.key === row)?.cells;
    if (cells === undefined || cells.length < 2) return null;
    const current = active !== null ? cells.indexOf(active) : -1;
    return cells[nextControlIndex(cells.length, current, cellStep)] ?? null;
  }

  // A region without markup is a flat list: every arrow steps through the
  // controls in DOM order, the entry rule applies to ←/→ too.
  const step = rowStep ?? cellStep;
  if (step === undefined) return null;
  return stepRows(rows, active, step, surface, rowMemory);
}

export function useControlWalk({ region, enabled = true }: ControlWalkOptions): void {
  useEffect(() => {
    if (!enabled) return;

    // Where focus sat inside a row: stepping back into the row restores it.
    const rowMemory = new WeakMap<object, HTMLElement>();

    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldSkipEvent(event)) return;
      if (hasCommandModifier(event)) return;

      const rowStep = ROW_STEP_BY_KEY[event.key];
      const cellStep = CELL_STEP_BY_KEY[event.key];
      if (rowStep === undefined && cellStep === undefined) return;

      const target = event.target instanceof Element ? event.target : null;
      if (target === null) return;
      const surface = region(target);
      if (surface === null) return;

      if (event.shiftKey) {
        if (rowStep === undefined) return;
        // Text fields keep Shift+↑/↓ for selection and caret movement.
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
        // No scrollbar — the region has nothing to scroll.
        if (surface.scrollHeight <= surface.clientHeight) return;
        event.preventDefault();
        surface.scrollBy({ top: rowStep * SCROLL_STEP_PX });
        return;
      }

      // A held arrow walks on: every system auto-repeat event is a step (the
      // same as the file list), so the walk needs no timer of its own.
      const next = resolveNextControl(target, surface, rowStep, cellStep, rowMemory);
      if (next === null) return;
      event.preventDefault();
      next.focus();
      next.scrollIntoView({ block: "nearest" });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, region]);
}
