"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FileTableColumn, FileTableItem } from "@swearjar/dos";
import { commandById, fileGroups, type CommandId } from "@/content/commands";
import type { DocId } from "@/content/landing";
import { buildRowIds, dirRowId, fileRowId, nextRowId } from "@/lib/file-manager";
import { formatSize } from "@/lib/format";
import { MOBILE_QUERY } from "./hooks/useIsMobile";

const FILE_COLUMNS: FileTableColumn[] = [
  { id: "name", label: "NAME" },
  { id: "type", label: "TYPE", width: "6ch" },
  { id: "size", label: "SIZE", width: "6ch", align: "right" },
];

const FILE_SIZE_ORDER = ["peek", "compact", "full"] as const;
export type FileListSize = (typeof FILE_SIZE_ORDER)[number];

const INITIAL_DOC_ID: DocId = "ABOUT";
const INITIAL_CURSOR_ID = fileRowId(INITIAL_DOC_ID);

export function useFileManager(isMobile: boolean) {
  const [selectedDocId, setSelectedDocId] = useState<DocId | null>(INITIAL_DOC_ID);
  const [cursorId, setCursorId] = useState(INITIAL_CURSOR_ID);
  const [collapsedGroups, setCollapsedGroups] = useState<readonly string[]>([]);
  const [listSize, setListSize] = useState<FileListSize>("compact");
  const focusCursor = useRef(false);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const onChange = () => {
      if (!query.matches) setListSize("compact");
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const rowIds = useMemo(() => buildRowIds(fileGroups, collapsedGroups), [collapsedGroups]);

  const moveCursor = useCallback(
    (direction: "up" | "down") => {
      const next = nextRowId(rowIds, cursorId, direction);
      if (!next) return;
      focusCursor.current = true;
      setCursorId(next);
    },
    [cursorId, rowIds],
  );

  const toggleGroup = useCallback((id: string) => {
    setCollapsedGroups((groups) =>
      groups.includes(id) ? groups.filter((group) => group !== id) : [...groups, id],
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
      if (group) setCollapsedGroups((groups) => groups.filter((id) => id !== group));
      if (isMobile) setListSize("compact");
    },
    [isMobile],
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
    for (const group of fileGroups) {
      const collapsed = collapsedGroups.includes(group.id);
      const dirId = dirRowId(group.id);
      items.push({
        id: dirId,
        name: group.short,
        type: "DIR",
        kind: "dir",
        expanded: !collapsed,
        selected: cursorId === dirId,
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
        items.push({
          id: rowId,
          name: item.name,
          type: item.ext,
          size: formatSize(item.size),
          kind: item.ext === "EXE" ? "exe" : "file",
          selected: cursorId === rowId,
          current: Boolean(docId) && docId === selectedDocId,
          href: command?.href,
          onActivate: () => {
            setCursorId(rowId);
            if (docId) openCommand(item.command);
          },
        });
      }
    }
    return items;
  }, [collapsedGroups, cursorId, openCommand, selectedDocId, toggleGroup]);

  const rowActionById = useMemo(() => {
    const actions = new Map<string, () => void>();
    for (const row of rows) {
      if (row.onActivate) actions.set(row.id, row.onActivate);
    }
    return actions;
  }, [rows]);

  const activateSelection = useCallback(() => {
    rowActionById.get(cursorId)?.();
  }, [cursorId, rowActionById]);

  useEffect(() => {
    if (!focusCursor.current) return;
    focusCursor.current = false;
    const element = document.getElementById(cursorId);
    element?.focus();
    element?.scrollIntoView({ block: "nearest" });
  }, [cursorId]);

  const fileCount = useMemo(
    () => fileGroups.reduce((total, group) => total + group.items.length, 0),
    [],
  );

  return {
    columns: FILE_COLUMNS,
    rows,
    dirCount: fileGroups.length,
    fileCount,
    selectedDocId,
    cursorId,
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
