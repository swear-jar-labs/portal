"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FileTableColumn, FileTableItem } from "@swearjar/dos";
import {
  commandById,
  commandIdForPath,
  HOME_PATH,
  type CommandId,
  type FileGroup,
} from "@/content/commands";
import type { DocId } from "@/content/docs";
import { messages } from "@/content/messages";
import { formatSize } from "@/lib/format";
import { isPlainActivation } from "./activation";
import { buildRowIds, dirRowId, fallbackRowId, fileRowId, nextRowId } from "./rows";

const FILE_COLUMNS: FileTableColumn[] = [
  { id: "name", label: messages.shell.files.columns.name },
  { id: "type", label: messages.shell.files.columns.type, width: "6ch" },
  { id: "size", label: messages.shell.files.columns.size, width: "6ch", align: "right" },
];

const FILE_SIZE_ORDER = ["peek", "compact", "full"] as const;
export type FileListSize = (typeof FILE_SIZE_ORDER)[number];

// The document shown when no route owns the right panel (boot, CLS, [X] on an
// inner window): the shell's default view.
export const DEFAULT_DOC_ID: DocId = "ABOUT";
const INITIAL_CURSOR_ID = fileRowId(DEFAULT_DOC_ID);

type CursorState = {
  id: string;
  pathname: string;
  signedIn: boolean;
};

function rowIdForPath(pathname: string): string | undefined {
  const commandId = commandIdForPath(pathname);
  return commandId ? fileRowId(commandId) : undefined;
}

function cursorStateFor(pathname: string, signedIn: boolean): CursorState {
  return { id: rowIdForPath(pathname) ?? INITIAL_CURSOR_ID, pathname, signedIn };
}

export type FileManagerOptions = {
  isMobile: boolean;
  pathname: string;
  signedIn: boolean;
  onDocumentOpened: () => void;
  groups: readonly FileGroup[];
  // Every file row runs through the command runner: it opens documents, pushes
  // routes in the SPA or runs actions (e.g. LOGOFF).
  onCommand: (commandId: CommandId) => void;
};

export function useFileManager({
  isMobile,
  pathname,
  signedIn,
  onDocumentOpened,
  groups,
  onCommand,
}: FileManagerOptions) {
  const [selectedDocId, setSelectedDocId] = useState<DocId | null>(DEFAULT_DOC_ID);
  const [cursor, setCursor] = useState<CursorState>(() => cursorStateFor(pathname, signedIn));
  const [collapsedGroups, setCollapsedGroups] = useState<readonly string[]>([]);
  const [listSize, setListSize] = useState<FileListSize>("compact");
  const focusCursor = useRef(false);
  const wasMobile = useRef(isMobile);

  useEffect(() => {
    if (wasMobile.current && !isMobile) setListSize("compact");
    wasMobile.current = isMobile;
  }, [isMobile]);

  const rowIds = useMemo(() => buildRowIds(groups, collapsedGroups), [groups, collapsedGroups]);

  const docRowId = selectedDocId ? fileRowId(selectedDocId) : undefined;
  const resetCursorId = fallbackRowId(rowIds, docRowId, INITIAL_CURSOR_ID);
  const routeRowId = rowIdForPath(pathname);

  // Adjusting state during render (React pattern) keeps the stored cursor in
  // sync with the route and the session: a new pathname stores the route's row
  // (or keeps the cursor on `/` and doc routes), a logon/logoff resets to the
  // displayed document even when the stale row still exists in the other
  // session's file list. A row that is gone (collapsed folder) falls back the
  // same way, instead of tracking all that in effects.
  if (cursor.pathname !== pathname || cursor.signedIn !== signedIn) {
    const id =
      cursor.pathname !== pathname
        ? (routeRowId ?? (cursor.signedIn !== signedIn ? resetCursorId : cursor.id))
        : resetCursorId;
    setCursor({ id, pathname, signedIn });
  }

  const activeCursorId = rowIds.includes(cursor.id) ? cursor.id : resetCursorId;

  const setCursorId = useCallback(
    (id: string) => setCursor({ id, pathname, signedIn }),
    [pathname, signedIn],
  );

  const moveCursor = useCallback(
    (direction: "up" | "down") => {
      const next = nextRowId(rowIds, activeCursorId, direction);
      if (!next) return;
      focusCursor.current = true;
      setCursorId(next);
    },
    [activeCursorId, rowIds, setCursorId],
  );

  const toggleGroup = useCallback((id: string) => {
    setCollapsedGroups((collapsed) =>
      collapsed.includes(id) ? collapsed.filter((group) => group !== id) : [...collapsed, id],
    );
  }, []);

  const openCommand = useCallback(
    (commandId: CommandId) => {
      const command = commandById.get(commandId);
      if (!command) return;
      setCursorId(fileRowId(commandId));
      if (!command.doc) return;
      setSelectedDocId(command.doc);
      const group = command.file?.group;
      if (group) setCollapsedGroups((collapsed) => collapsed.filter((id) => id !== group));
      if (isMobile) setListSize("compact");
      onDocumentOpened();
    },
    [isMobile, onDocumentOpened, setCursorId],
  );

  const closeDoc = useCallback(() => setSelectedDocId(null), []);

  const cycleSize = useCallback((direction: 1 | -1) => {
    setListSize((current) => {
      const index = FILE_SIZE_ORDER.indexOf(current);
      const step = FILE_SIZE_ORDER.length;
      return FILE_SIZE_ORDER[(index + direction + step) % step] ?? FILE_SIZE_ORDER[0];
    });
  }, []);

  const rows = useMemo<FileTableItem[]>(() => {
    const items: FileTableItem[] = [];
    const onHome = pathname === HOME_PATH;
    for (const group of groups) {
      const collapsed = collapsedGroups.includes(group.id);
      const dirId = dirRowId(group.id);
      items.push({
        id: dirId,
        name: group.short,
        type: "DIR",
        kind: "dir",
        expanded: !collapsed,
        selected: activeCursorId === dirId,
        onActivate: () => {
          setCursorId(dirId);
          toggleGroup(group.id);
        },
      });

      if (collapsed) continue;

      for (const item of group.items) {
        const rowId = fileRowId(item.command);
        const command = commandById.get(item.command);
        const docId = command?.doc;
        const href = command?.href;
        items.push({
          id: rowId,
          name: item.name,
          type: item.ext,
          size: formatSize(item.size),
          kind: item.ext === "EXE" ? "exe" : "file",
          icon: item.icon,
          selected: activeCursorId === rowId,
          // Documents are current only where they are shown (the home panel);
          // sections are current on their own route.
          current: docId ? onHome && docId === selectedDocId : href === pathname,
          href,
          onActivate: (event) => {
            setCursorId(rowId);
            if (href) {
              // Modified clicks on a routed file keep the native behavior (new tab).
              if (!isPlainActivation(event)) return;
              event?.preventDefault();
            }
            onCommand(item.command);
          },
        });
      }
    }
    return items;
  }, [
    activeCursorId,
    collapsedGroups,
    groups,
    onCommand,
    pathname,
    selectedDocId,
    setCursorId,
    toggleGroup,
  ]);

  const rowActionById = useMemo(() => {
    const actions = new Map<string, () => void>();
    for (const row of rows) {
      if (row.onActivate) actions.set(row.id, row.onActivate);
    }
    return actions;
  }, [rows]);

  const activateSelection = useCallback(() => {
    rowActionById.get(activeCursorId)?.();
  }, [activeCursorId, rowActionById]);

  useEffect(() => {
    if (!focusCursor.current) return;
    focusCursor.current = false;
    const element = document.getElementById(activeCursorId);
    element?.focus();
    element?.scrollIntoView({ block: "nearest" });
  }, [activeCursorId]);

  const fileCount = useMemo(
    () => groups.reduce((total, group) => total + group.items.length, 0),
    [groups],
  );

  return {
    columns: FILE_COLUMNS,
    rows,
    dirCount: groups.length,
    fileCount,
    selectedDocId,
    cursorId: activeCursorId,
    collapsedGroups,
    listSize,
    moveCursor,
    toggleGroup,
    activateSelection,
    openCommand,
    closeDoc,
    cycleSize,
  };
}
