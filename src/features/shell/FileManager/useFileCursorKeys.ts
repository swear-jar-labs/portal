"use client";

import { useEffect } from "react";
import { DOS_SCROLL_ATTR, DOS_ZONE_ATTR } from "@swearjar/dos";
import { CMD_ZONE, DOC_ZONE, FILES_ZONE } from "../zones";
import { DIR_ROW_PREFIX } from "./rows";

const INPUT_GUARD_SELECTOR = "input, textarea, select, [role='menubar'], [role='menu']";

export type FileCursorKeysOptions = {
  enabled: boolean;
  cursorId: string;
  collapsedGroups: readonly string[];
  moveCursor: (direction: "up" | "down") => void;
  toggleGroup: (id: string) => void;
  activate: () => void;
};

export function useFileCursorKeys({
  enabled,
  cursorId,
  collapsedGroups,
  moveCursor,
  toggleGroup,
  activate,
}: FileCursorKeysOptions) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      const zone = target?.closest(`[${DOS_ZONE_ATTR}]`)?.getAttribute(DOS_ZONE_ATTR);

      // Tab is the panel toggle: the file list and the right-hand panel, from
      // any control of the panel too, and back from the command line. Shift
      // does not change the target.
      if (event.key === "Tab") {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (zone === FILES_ZONE) {
          const doc = document.querySelector<HTMLElement>(
            `[${DOS_ZONE_ATTR}='${DOC_ZONE}'] [${DOS_SCROLL_ATTR}]`,
          );
          if (!doc) return;
          event.preventDefault();
          doc.focus();
          return;
        }
        if (zone !== DOC_ZONE && zone !== CMD_ZONE) return;
        const row = document.getElementById(cursorId);
        if (!row) return;
        event.preventDefault();
        row.scrollIntoView({ block: "nearest" });
        row.focus();
        return;
      }

      if (target?.closest(INPUT_GUARD_SELECTOR)) return;
      if (zone === DOC_ZONE) return;

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        event.preventDefault();
        moveCursor(event.key === "ArrowUp" ? "up" : "down");
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (cursorId.startsWith(DIR_ROW_PREFIX)) {
          const groupId = cursorId.slice(DIR_ROW_PREFIX.length);
          const collapsed = collapsedGroups.includes(groupId);
          if (event.key === "ArrowRight" && collapsed) {
            event.preventDefault();
            toggleGroup(groupId);
          } else if (event.key === "ArrowLeft" && !collapsed) {
            event.preventDefault();
            toggleGroup(groupId);
          }
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          activate();
        }
        return;
      }

      if (
        (event.key === "Enter" || event.key === " ") &&
        document.activeElement === document.body
      ) {
        event.preventDefault();
        activate();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, cursorId, collapsedGroups, moveCursor, toggleGroup, activate]);
}
