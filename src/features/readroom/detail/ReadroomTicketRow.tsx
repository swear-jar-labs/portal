"use client";

import { Link, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useOverlayPush } from "@/features/shell";
import { ticketPath, type Ticket } from "@/features/tickets/contracts";
import { readroomTaskTicketId } from "../model/readrooms";

export type ReadroomTicketRowProps = {
  // The linked ticket's key, if the task names one.
  ticket: string | undefined;
  // The queue the key resolves against (merged with the session's tickets by
  // the caller): an unknown key still links, it only loses the title.
  tickets: readonly Ticket[];
};

/** The task's linked ticket under the attached files: the key as a link to
 * the live dossier plus the ticket's title. The dossier opens as an overlay
 * layer above the readroom (the root slot intercepts it). */
export function ReadroomTicketRow({ ticket, tickets }: ReadroomTicketRowProps) {
  const openOverlay = useOverlayPush();
  if (ticket === undefined) return null;
  const target = tickets.find((entry) => entry.key === ticket);
  const href = ticketPath(ticket);
  const id = readroomTaskTicketId(ticket);
  return (
    <Stack gap={2}>
      <Text as="span" role="hint">
        {messages.readroom.task.ticket}
      </Text>
      <Stack direction="row" gap={8} align="baseline" wrap navRow>
        <Link id={id} href={href} onClick={openOverlay(href, id)}>
          {ticket}
        </Link>
        {target === undefined ? null : (
          <Text as="span" role="hint">
            {target.title}
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
