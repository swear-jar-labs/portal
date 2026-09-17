"use client";

import { useEffect } from "react";
import {
  DOS_ROW_ATTR,
  DOS_SCROLL_ATTR,
  DOS_ZONE_ATTR,
  FOCUSABLE_SELECTOR,
  nextControlIndex,
} from "@swearjar/dos";
import { DOC_ZONE } from "../zones";
import { groupControlRows } from "./control-rows";
import { hasCommandModifier, shouldSkipEvent } from "./keyboard";

// The shell's two-axis walk of the right-hand panel: bare ↑/↓ step between rows
// (a control without the row mark is a row of its own) and ←/→ step between the
// controls inside the focused row. Ctrl, Alt and Meta stay native: word-wise
// caret movement and OS shortcuts.
const ROW_STEP_BY_KEY: Record<string, 1 | -1> = { ArrowDown: 1, ArrowUp: -1 };
const CELL_STEP_BY_KEY: Record<string, 1 | -1> = { ArrowRight: 1, ArrowLeft: -1 };

// Shift+↑/↓ scrolls the panel by one step: pressing scrolls once, holding
// keeps scrolling (repeat is fine for a scroll gesture).
const SCROLL_STEP_PX = 60;

export function usePanelNav(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    // Where focus sat inside a row: stepping back into the row restores it.
    const rowMemory = new WeakMap<object, HTMLElement>();

    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldSkipEvent(event)) return;
      if (hasCommandModifier(event)) return;

      const target = event.target as HTMLElement | null;
      const zone = target?.closest(`[${DOS_ZONE_ATTR}]`)?.getAttribute(DOS_ZONE_ATTR);
      if (zone !== DOC_ZONE) return;
      // closest() (not querySelector) keeps the walk inside the focused panel body.
      const surface = target?.closest(`[${DOS_SCROLL_ATTR}]`);
      if (!surface) return;

      const rowStep = ROW_STEP_BY_KEY[event.key];
      const cellStep = CELL_STEP_BY_KEY[event.key];
      if (!rowStep && !cellStep) return;

      if (event.shiftKey) {
        if (!rowStep) return;
        // Text fields keep Shift+↑/↓ for selection and caret movement.
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
        // No scrollbar — the panel has nothing to scroll.
        if (surface.scrollHeight <= surface.clientHeight) return;
        event.preventDefault();
        surface.scrollBy({ top: rowStep * SCROLL_STEP_PX });
        return;
      }

      if (event.repeat) return;

      // Text fields keep their arrows: caret movement and the matching edge.
      if (target instanceof HTMLTextAreaElement) {
        if (!rowStep) return;
        const atEnd = target.selectionStart === target.value.length;
        const atStart = target.selectionStart === 0;
        if (rowStep === 1 ? !atEnd : !atStart) return;
      }
      if (
        cellStep &&
        (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
      ) {
        return;
      }
      // An open combobox owns its keyboard until it closes.
      if (cellStep && target?.closest('[aria-expanded="true"]')) return;

      const controls = Array.from(surface.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      // A viewer without controls (a document) keeps the arrows native: scroll.
      if (controls.length === 0) return;

      const rows = groupControlRows(controls, (control) => control.closest(`[${DOS_ROW_ATTR}]`));
      const active = document.activeElement;

      if (rowStep) {
        const rowIndex =
          active instanceof HTMLElement ? rows.findIndex((row) => row.cells.includes(active)) : -1;
        // Remember where the walk leaves the row, so a step back lands there.
        const currentRow = rowIndex >= 0 ? rows[rowIndex] : undefined;
        if (currentRow && active instanceof HTMLElement) {
          rowMemory.set(currentRow.key, active);
        }
        const row = rows[nextControlIndex(rows.length, rowIndex, rowStep)];
        if (!row) return;
        const remembered = rowMemory.get(row.key);
        const next = remembered && row.cells.includes(remembered) ? remembered : row.cells[0];
        if (!next) return;

        event.preventDefault();
        next.focus();
        next.scrollIntoView({ block: "nearest" });
        return;
      }

      // ←/→ only walk a marked row; anywhere else they stay native.
      if (!cellStep) return;
      const focusedRow = target?.closest<HTMLElement>(`[${DOS_ROW_ATTR}]`);
      if (!focusedRow || !surface.contains(focusedRow)) return;
      const cells = rows.find((row) => row.key === focusedRow)?.cells;
      if (!cells || cells.length < 2) return;

      const current = active instanceof HTMLElement ? cells.indexOf(active) : -1;
      const next = cells[nextControlIndex(cells.length, current, cellStep)];
      if (!next) return;

      event.preventDefault();
      next.focus();
      next.scrollIntoView({ block: "nearest" });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
