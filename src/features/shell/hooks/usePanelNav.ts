"use client";

import { useCallback } from "react";
import { DOS_SCROLL_ATTR, DOS_ZONE_ATTR, useControlWalk } from "@swearjar/dos";
import { DOC_ZONE } from "../zones";

// The shell's policy for the kit's control walk: only the doc zone (the
// right-hand panel) walks, and its region is the panel body the event came
// from. closest() (not querySelector) keeps the walk inside the focused body:
// a deep panel layer owns the keyboard, the shell only gates the timing.
export function usePanelNav(enabled: boolean) {
  const region = useCallback((target: Element): Element | null => {
    const zone = target.closest(`[${DOS_ZONE_ATTR}]`)?.getAttribute(DOS_ZONE_ATTR);
    if (zone !== DOC_ZONE) return null;
    return target.closest(`[${DOS_SCROLL_ATTR}]`);
  }, []);

  useControlWalk({ region, enabled });
}
