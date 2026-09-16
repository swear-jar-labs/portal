"use client";

import { useEffect } from "react";
import {
  DOS_SCROLL_ATTR,
  DOS_ZONE_ATTR,
  FOCUSABLE_SELECTOR,
  nextControlIndex,
} from "@swearjar/dos";
import { DOC_ZONE } from "../zones";

// Bare ↑/↓ walk the controls of the right-hand panel with wrap-around, from the
// panel surface (the Tab entry point) and from any control in it. The shell owns
// the walk because it also covers links and buttons outside a form. Ctrl, Alt
// and Meta stay native: word-wise caret movement and OS shortcuts.
const STEP_BY_KEY: Record<string, 1 | -1> = { ArrowDown: 1, ArrowUp: -1 };

// Shift+↑/↓ scrolls the panel by one step: pressing scrolls once, holding
// keeps scrolling (repeat is fine for a scroll gesture).
const SCROLL_STEP_PX = 60;

export function usePanelNav(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const step = STEP_BY_KEY[event.key];
      if (!step) return;

      const target = event.target as HTMLElement | null;
      const zone = target?.closest(`[${DOS_ZONE_ATTR}]`)?.getAttribute(DOS_ZONE_ATTR);
      if (zone !== DOC_ZONE) return;
      // closest() (not querySelector) keeps the walk inside the focused panel body.
      const surface = target?.closest(`[${DOS_SCROLL_ATTR}]`);
      if (!surface) return;

      if (event.shiftKey) {
        // Text fields keep Shift+↑/↓ for selection and caret movement.
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
        // No scrollbar — the panel has nothing to scroll.
        if (surface.scrollHeight <= surface.clientHeight) return;
        event.preventDefault();
        surface.scrollBy({ top: step * SCROLL_STEP_PX });
        return;
      }

      if (event.repeat) return;

      // A textarea keeps the caret: its arrows leave the field only from the
      // matching edge (an approximation by caret position, not by lines).
      if (target instanceof HTMLTextAreaElement) {
        const atEnd = target.selectionStart === target.value.length;
        const atStart = target.selectionStart === 0;
        if (step === 1 ? !atEnd : !atStart) return;
      }

      const controls = Array.from(surface.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      // A viewer without controls (a document) keeps the arrows native: scroll.
      if (controls.length === 0) return;

      const active = document.activeElement;
      const current = active instanceof HTMLElement ? controls.indexOf(active) : -1;
      const next = controls[nextControlIndex(controls.length, current, step)];
      if (!next) return;

      event.preventDefault();
      next.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
