import { avatarFor } from "@/shared/members";
import { freshTicketAccess, isCurrentMember } from "./mock-ticket-access";
import { ticketAssigneeSchema, type TicketEditInput } from "./schema";
import { editTicket, mergedTickets, ticketsSnapshot } from "./ticket-store";
import { openBlockers, ticketsById, type Ticket } from "./tickets";
import {
  activeTicketFor,
  canChangeTicketStatus,
  canEditTicket,
  isActiveTicket,
  isProjectManager,
  reviewerCandidates,
} from "./workflow";

export type TicketEditChanges = {
  assignee: string | null | undefined;
  reviewer: string | null | undefined;
};

export type TicketEditFailure =
  "denied" | "assignee" | "active" | "reviewer" | "status" | "blocked";

function sameTags(current: readonly string[], live: readonly string[]): boolean {
  return current.length === live.length && current.every((tag, index) => tag === live[index]);
}

/** One checked commit for both routed and overlay editors. The fresh project
 * seat is read after the form opens, and the queue is rebuilt at commit time. */
export async function submitTicketEdit(
  editing: Ticket,
  baseTickets: readonly Ticket[],
  input: TicketEditInput,
  changes: TicketEditChanges,
): Promise<TicketEditFailure | null> {
  const access = await freshTicketAccess(editing.project);
  if (!access) return "denied";
  const all = mergedTickets(baseTickets, ticketsSnapshot());
  const live = all.find((ticket) => ticket.id === editing.id);
  if (!live || !canEditTicket(access.actor, live, access.project)) return "denied";
  const manager = isProjectManager(access.actor, access.project);
  if (!manager && (changes.assignee !== undefined || changes.reviewer !== undefined))
    return "denied";
  if (!manager && !canChangeTicketStatus(access.actor, live, input.status)) return "status";
  if (
    !manager &&
    access.actor?.user !== live.author.user &&
    (input.title !== live.title ||
      input.body !== live.body ||
      input.size !== live.size ||
      input.priority !== live.priority ||
      !sameTags(input.tags, live.tags))
  )
    return "denied";
  if (input.status === "in_progress" && openBlockers(live, ticketsById(all)).length > 0)
    return "blocked";

  const target =
    changes.assignee === undefined ? live.assignee?.user : (changes.assignee ?? undefined);
  if (
    changes.assignee !== undefined &&
    changes.assignee !== null &&
    (!ticketAssigneeSchema.safeParse(changes.assignee).success ||
      !(await isCurrentMember(changes.assignee)))
  )
    return "assignee";
  if (
    target &&
    isActiveTicket({ ...live, status: input.status }) &&
    (target !== live.assignee?.user || !isActiveTicket(live)) &&
    activeTicketFor(all, target, live.id)
  )
    return "active";
  if (changes.assignee !== undefined && access.project.maintainers.length === 0) return "denied";
  if (
    changes.reviewer !== undefined &&
    changes.reviewer !== null &&
    !reviewerCandidates(access.project, target).includes(changes.reviewer)
  )
    return "reviewer";

  editTicket(editing.id, input, {
    ...(changes.assignee === undefined
      ? {}
      : {
          assignee:
            changes.assignee === null
              ? null
              : { user: changes.assignee, avatar: avatarFor(changes.assignee) },
        }),
    ...(changes.reviewer !== undefined
      ? {
          reviewer:
            changes.reviewer === null
              ? null
              : { user: changes.reviewer, avatar: avatarFor(changes.reviewer) },
        }
      : changes.assignee !== undefined && (!target || target === live.reviewer?.user)
        ? { reviewer: null }
        : {}),
    previousClosedAt: live.closedAt,
    actor: access.actor?.user,
    before: live,
  });
  return null;
}
