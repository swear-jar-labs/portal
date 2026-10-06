"use client";

import { useMemo, useState } from "react";
import { Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { countRecentErrata, type ThreadSummary } from "../model/threads";

// The board's jar row: a leaf for the shell's dialog (see ShellAddon.jar).
// It counts over the server summaries the layout passes in, so the shell
// never imports the board slice (see AGENTS.md).
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
  const count = useMemo(
    () => countRecentErrata(threads, frozenNow, windowMs),
    [threads, frozenNow, windowMs],
  );
  return <Text as="div">{`${messages.shell.dialogs.jar.errata}: ${count}`}</Text>;
}
