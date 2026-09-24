import { avatarFor } from "@/shared/members";
import type { TicketEditInput } from "./schema";
import { editTicket } from "./ticket-store";
import type { Ticket } from "./tickets";

/**
 * The shared edit submit: the stack's edit layer and the overlay dossier's
 * edit panel persist the same way. Taking a ticket happens on its dossier
 * (ASSIGN TO ME, gated by the ladder); the edit layer never claims. The
 * assignee here is the maintainer's reassignment, ungated by design.
 */
export function submitTicketEdit(
  editing: Ticket,
  input: TicketEditInput,
  assignee: string | null | undefined,
): void {
  editTicket(editing.id, input, {
    ...(assignee === undefined
      ? {}
      : {
          assignee: assignee === null ? null : { user: assignee, avatar: avatarFor(assignee) },
        }),
    previousClosedAt: editing.closedAt,
  });
}
