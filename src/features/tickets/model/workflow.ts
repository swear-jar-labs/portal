import type { Actor } from "@/features/account/contracts";
import type { ClaimPolicy, Project } from "@/features/projects/contracts";
import { claimRefusal, countDoneBySize } from "./claim";
import { isBlocked, ticketsById, type Ticket, type TicketStatus } from "./tickets";

export type TicketActor = Pick<Actor, "user" | "level" | "admin"> | null;
export type TicketProject = Pick<
  Project,
  "slug" | "status" | "lead" | "maintainers" | "reviewers" | "claimPolicy"
>;

export const ACTIVE_TICKET_STATUSES = ["open", "in_progress", "review"] as const;
export const INACTIVITY_DAYS = 3;
const DAY_MS = 86_400_000;
export const INACTIVITY_MS = INACTIVITY_DAYS * DAY_MS;

export function isActiveTicket(ticket: Ticket): boolean {
  return ACTIVE_TICKET_STATUSES.some((status) => status === ticket.status);
}

export function activeTicketFor(tickets: readonly Ticket[], user: string, exceptId?: string) {
  return tickets.find(
    (ticket) => ticket.id !== exceptId && ticket.assignee?.user === user && isActiveTicket(ticket),
  );
}

export function isProjectManager(actor: TicketActor, project: TicketProject): boolean {
  if (actor?.level !== "member") return false;
  return (
    project.lead?.user === actor.user ||
    project.maintainers.some((person) => person.user === actor.user)
  );
}

export function canWriteTicket(actor: TicketActor, project: TicketProject): boolean {
  return actor?.level === "member" && project.status !== "archived";
}

export function canEditTicket(actor: TicketActor, ticket: Ticket, project: TicketProject): boolean {
  return (
    canWriteTicket(actor, project) &&
    (isProjectManager(actor, project) ||
      actor?.user === ticket.author.user ||
      actor?.user === ticket.assignee?.user)
  );
}

/** An assignee can move active work between working statuses, but cannot
 * reopen a completed ticket. Project managers have a separate full status set. */
export function canChangeTicketStatus(
  actor: TicketActor,
  ticket: Ticket,
  next: TicketStatus,
): boolean {
  if (next === ticket.status) return true;
  return (
    actor?.user === ticket.assignee?.user &&
    isActiveTicket(ticket) &&
    (next === "in_progress" || next === "review")
  );
}

export function canManageTicketBlockers(actor: TicketActor, project: TicketProject): boolean {
  return (
    canWriteTicket(actor, project) &&
    project.maintainers.some((person) => person.user === actor?.user)
  );
}

export function reviewerCandidates(project: TicketProject, assignee?: string): string[] {
  return [
    ...new Set([
      ...project.maintainers.map((person) => person.user),
      ...(project.reviewers ?? []).map((person) => person.user),
    ]),
  ]
    .filter((user) => user !== assignee)
    .sort();
}

/** Rotate through the project's stable reviewer pool, skipping the assignee. */
export function nextReviewer(
  project: TicketProject,
  assignee: string,
  previous?: string,
): string | null {
  const pool = reviewerCandidates(project);
  if (pool.length === 0) return null;
  const previousIndex = previous === undefined ? -1 : pool.indexOf(previous);
  for (let offset = 1; offset <= pool.length; offset += 1) {
    const user = pool[(previousIndex + offset) % pool.length];
    if (user && user !== assignee) return user;
  }
  return null;
}

export type ClaimBlock =
  | "login"
  | "member"
  | "archived"
  | "paused"
  | "assigned"
  | "status"
  | "blocked"
  | "active"
  | "ladder";

/** A pure gate shared by the dossier and the checked mock operation. */
export function claimBlock(
  actor: TicketActor,
  ticket: Ticket,
  tickets: readonly Ticket[],
  project: TicketProject,
  policy: ClaimPolicy = project.claimPolicy,
): ClaimBlock | null {
  if (actor === null) return "login";
  if (actor.level !== "member") return "member";
  if (project.status === "archived") return "archived";
  if (project.maintainers.length === 0) return "paused";
  if (!isActiveTicket(ticket)) return "status";
  if (ticket.assignee !== undefined) return "assigned";
  if (isBlocked(ticket, ticketsById(tickets))) return "blocked";
  if (activeTicketFor(tickets, actor.user, ticket.id)) return "active";
  if (claimRefusal(policy, countDoneBySize(tickets, actor.user), ticket.size)) return "ladder";
  return null;
}

/** Only assigned work needs a check-in; a date in the future cannot be stale. */
export function needsMaintainerCheckIn(ticket: Ticket, now: string): boolean {
  if (!ticket.assignee || !isActiveTicket(ticket)) return false;
  const activity = Date.parse(ticket.lastActivityAt ?? ticket.updatedAt);
  const current = Date.parse(now);
  return (
    Number.isFinite(activity) && Number.isFinite(current) && current - activity >= INACTIVITY_MS
  );
}
