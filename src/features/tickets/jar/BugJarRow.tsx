"use client";

import { useMemo, useState } from "react";
import { Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { mergedTickets } from "../data/ticket-store";
import { useTicketState } from "../data/useTicketSession";
import { countRecentBugs, type Ticket } from "../model/tickets";

// The tickets' jar row: a leaf for the shell's dialog (see ShellAddon.jar).
// It reads only its own store over the fixture tickets the layout passes in,
// so the shell never imports the tickets slice (see AGENTS.md).
export function BugJarRow({
  tickets,
  windowMs,
  now,
}: {
  tickets: readonly Ticket[];
  windowMs: number;
  now?: number;
}) {
  const [frozenNow] = useState(() => now ?? Date.now());
  const state = useTicketState();
  const count = useMemo(
    () => countRecentBugs(mergedTickets(tickets, state), frozenNow, windowMs),
    [tickets, state, frozenNow, windowMs],
  );
  return <Text as="div">{`${messages.shell.dialogs.jar.bugs}: ${count}`}</Text>;
}
