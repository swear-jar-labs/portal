"use client";

import { useOverlayPush } from "@/features/shell";
import { ticketPath, ticketRowId, type Ticket } from "../model/tickets";
import { TicketsTable, type TicketTableAction } from "./TicketsTable";

export type TicketsOverlayTableProps = {
  tickets: readonly Ticket[];
  projectNames: Readonly<Record<string, string>>;
  currentKey?: string;
  label?: string;
};

/**
 * The tickets table that opens a dossier as an overlay layer: the root slot
 * intercepts the route above the current stack, so a project page's LAST
 * UPDATES keeps its own layer and returns focus to the row on close.
 */
export function TicketsOverlayTable({
  tickets,
  projectNames,
  currentKey,
  label,
}: TicketsOverlayTableProps) {
  const pushOverlay = useOverlayPush();

  return (
    <TicketsTable
      tickets={tickets}
      projectNames={projectNames}
      currentKey={currentKey}
      label={label}
      actionForTicket={(ticket): TicketTableAction => ({
        href: ticketPath(ticket.key),
        onActivate: pushOverlay(ticketPath(ticket.key), ticketRowId(ticket.key)),
      })}
    />
  );
}
