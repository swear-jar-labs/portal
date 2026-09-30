"use client";

import { useEffect } from "react";
import { buildTicketStallEvents, enqueueInboxEvent } from "@/features/inbox/contracts";
import { ticketPath } from "../model/tickets";

export type TicketStallInput = {
  ticketId: string;
  ticketKey: string;
  projectLabel: string;
  actorUser: string | null;
  stalled: boolean;
  maintainers: readonly string[];
  lead: string | null;
};

// No scheduler runs in the mocks, so the open dossier is the stall signal's
// only observer. The stable event id plus this session guard deliver once per
// mock session; the recipients come from the live project, not the viewer.
const delivered = new Set<string>();

export function useTicketStallNotifier(input: TicketStallInput): void {
  const { ticketId, ticketKey, projectLabel, actorUser, stalled, maintainers, lead } = input;
  const maintainersKey = [...maintainers].sort().join("\u0000");
  useEffect(() => {
    if (!stalled) return;
    if (delivered.has(ticketId)) return;
    delivered.add(ticketId);
    const at = new Date().toISOString();
    for (const delivery of buildTicketStallEvents({
      ticketId,
      ticketKey,
      projectLabel,
      actorUser,
      maintainers,
      lead,
      target: { kind: "ticket", label: ticketKey, href: ticketPath(ticketKey) },
      at,
    }))
      enqueueInboxEvent(delivery.user, delivery.event);
  }, [actorUser, lead, maintainers, maintainersKey, projectLabel, stalled, ticketId, ticketKey]);
}

/** Test seam: let the next mount deliver again. */
export function resetTicketStallForTests(): void {
  delivered.clear();
}
