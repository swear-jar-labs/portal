"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { boardServerSnapshot, boardSnapshot, subscribeBoard } from "../data/board-store";
import { countRecentErrata, summarizeThread, type ThreadSummary } from "../model/threads";

// The board's jar row: a leaf for the shell's dialog (see ShellAddon.jar).
// It reads only its own store over the fixture summaries the layout passes
// in, so the shell never imports the board slice (see AGENTS.md).
export function ErrataJarRow({
  threads,
  windowMs,
  now,
}: {
  threads: readonly ThreadSummary[];
  windowMs: number;
  now?: number;
}) {
  const [frozenNow] = useState(() => now ?? Date.now());
  const state = useSyncExternalStore(subscribeBoard, boardSnapshot, boardServerSnapshot);
  const count = useMemo(
    () =>
      countRecentErrata(
        [...state.addedThreads.map(summarizeThread), ...threads],
        frozenNow,
        windowMs,
      ),
    [state.addedThreads, threads, frozenNow, windowMs],
  );
  return <Text as="div">{`${messages.shell.dialogs.jar.errata}: ${count}`}</Text>;
}
