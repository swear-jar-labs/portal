import {
  nextTicketKey,
  type Ticket,
  type TicketComment,
  type TicketLink,
  type TicketPerson,
} from "../model/tickets";
import type { TicketComposeInput, TicketEditInput } from "../model/schema";
import { avatarFor } from "@/shared/members";
import { recordTicketEvent, resetTicketEvents } from "./ticket-events";
import {
  claimBlock,
  nextReviewer,
  type ClaimBlock,
  type TicketActor,
  type TicketProject,
} from "../model/workflow";

// The tickets' session memory: the mock state outlives the route remount (the
// tracker unmounts when a dossier opens) and dies with the page reload. The
// store owns its transitions as methods — the components call them through
// useTicketSession. Phase 5 replaces these methods with server actions.

// The fields a session action may change on any ticket (fixture or composed);
// comments are additive and live in their own key.
export type TicketPatch = Partial<
  Pick<
    Ticket,
    | "title"
    | "body"
    | "size"
    | "priority"
    | "tags"
    | "status"
    | "assignee"
    | "reviewer"
    | "closedAt"
    | "updatedAt"
    | "lastActivityAt"
    | "blockedBy"
  >
> & {
  comments?: readonly TicketComment[];
  // Comment edits by id: the body replaces the stored one (fixture comments
  // included), the timestamp drives the [EDITED] mark.
  commentEdits?: Readonly<Record<string, { body: string; editedAt: string }>>;
  // Deleted comment ids with their timestamps: the item stays as a tombstone.
  deletedComments?: Readonly<Record<string, string>>;
};

export type TicketsState = {
  addedTickets: readonly Ticket[];
  // Links pinned to fixture tickets in this session (composed tickets carry
  // their own, empty, list).
  sessionLinks: Readonly<Record<string, readonly TicketLink[]>>;
  // Pinned link ids dropped in this session, fixture links included.
  removedLinks: Readonly<Record<string, readonly string[]>>;
  // The session's edits over any ticket: status, assignee, blockers, comments.
  patches: Readonly<Record<string, TicketPatch>>;
  lastReviewerByProject: Readonly<Record<string, string>>;
};

const INITIAL_TICKETS_STATE: TicketsState = {
  addedTickets: [],
  sessionLinks: {},
  removedLinks: {},
  patches: {},
  lastReviewerByProject: {},
};

const LOCAL_TICKET_ID_PREFIX = "local-ticket-";
const LOCAL_LINK_ID_PREFIX = "local-link-";
const LOCAL_COMMENT_ID_PREFIX = "local-comment-";

function localId(prefix: string): string {
  return `${prefix}${crypto.randomUUID()}`;
}

let state: TicketsState = INITIAL_TICKETS_STATE;
const listeners = new Set<() => void>();

function setState(next: TicketsState): void {
  state = next;
  for (const listener of listeners) listener();
}

function patchTicket(
  ticketId: string,
  patch: TicketPatch,
  rotation?: { project: string; reviewer: string },
): void {
  const current = state.patches[ticketId] ?? {};
  setState({
    ...state,
    patches: { ...state.patches, [ticketId]: { ...current, ...patch } },
    ...(rotation
      ? {
          lastReviewerByProject: {
            ...state.lastReviewerByProject,
            [rotation.project]: rotation.reviewer,
          },
        }
      : {}),
  });
}

export function nextProjectReviewer(project: TicketProject, assignee: string): string | null {
  return nextReviewer(project, assignee, state.lastReviewerByProject[project.slug]);
}

export function subscribeTickets(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function ticketsSnapshot(): TicketsState {
  return state;
}

export function ticketsServerSnapshot(): TicketsState {
  return INITIAL_TICKETS_STATE;
}

/** Test isolation for the module-level UI-first session. */
export function resetTicketsStore(): void {
  state = INITIAL_TICKETS_STATE;
  resetTicketEvents();
}

/** A ticket composed in this session: authored by the logged-on member, open,
 * unassigned, without links or comments. The key continues the project's
 * sequence over the given tickets (fixtures and the session's own). */
export function addTicket(
  input: TicketComposeInput,
  author: TicketPerson,
  known: readonly Ticket[],
): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: localId(LOCAL_TICKET_ID_PREFIX),
    key: nextTicketKey(input.project, known),
    project: input.project,
    title: input.title,
    body: input.body,
    status: "open",
    size: input.size,
    priority: input.priority,
    tags: [...input.tags],
    author,
    links: [],
    comments: [],
    blockedBy: [],
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };
  setState({ ...state, addedTickets: [...state.addedTickets, ticket] });
  recordTicketEvent({ ticketId: ticket.id, kind: "created", actor: author.user, at: now });
  return ticket;
}

/** A link pinned to a ticket in this session. The mock mirrors the database's
 * `unique (ticket_id, url)`: pinning a known url returns the existing link. */
export function addTicketLink(ticketId: string, link: Omit<TicketLink, "id">): TicketLink {
  const current = state.sessionLinks[ticketId] ?? [];
  const existing = current.find((entry) => entry.url === link.url);
  if (existing !== undefined) return existing;
  const pinned: TicketLink = { ...link, id: localId(LOCAL_LINK_ID_PREFIX) };
  const now = new Date().toISOString();
  setState({
    ...state,
    sessionLinks: { ...state.sessionLinks, [ticketId]: [...current, pinned] },
    patches: {
      ...state.patches,
      [ticketId]: {
        ...state.patches[ticketId],
        updatedAt: now,
        lastActivityAt: now,
      },
    },
  });
  recordTicketEvent({ ticketId, kind: "linked", actor: link.addedBy.user, at: now });
  return pinned;
}

/** A link unpinned in this session: the id lands in the tombstones, fixture
 * links included. The views filter them out of the merged list. */
export function removeTicketLink(ticketId: string, linkId: string, actor?: string): void {
  const current = state.removedLinks[ticketId] ?? [];
  if (current.includes(linkId)) return;
  setState({
    ...state,
    removedLinks: { ...state.removedLinks, [ticketId]: [...current, linkId] },
  });
  if (actor) recordTicketEvent({ ticketId, kind: "unlinked", actor, at: new Date().toISOString() });
}

/** The side effects of an edit the store cannot read off the base ticket: the
 * maintainer's reassignment and the closing stamp the ticket had before. */
export type TicketEditOptions = {
  // The maintainer's reassignment: a person sets it, null clears it,
  // undefined leaves it alone.
  assignee?: TicketPerson | null;
  // The stamp the ticket carried before the edit: entering a terminal status
  // stamps the closing time, staying terminal keeps the original, leaving
  // terminal clears it.
  previousClosedAt?: string;
  reviewer?: TicketPerson | null;
  actor?: string;
  before?: Ticket;
};

/** The editor's form: the fields and the status land as one patch and the
 * update stamp moves the row up the queue. The assignee option carries the
 * maintainer's reassignment; the claim ladder never gates it. Role checks
 * live in the edit layer — the store only lands the patch. */
export function editTicket(
  ticketId: string,
  input: TicketEditInput,
  options: TicketEditOptions = {},
): void {
  const terminal = input.status === "done" || input.status === "closed";
  const now = new Date().toISOString();
  patchTicket(ticketId, {
    ...input,
    tags: [...input.tags],
    ...(options.assignee === undefined ? {} : { assignee: options.assignee ?? undefined }),
    ...(options.reviewer === undefined ? {} : { reviewer: options.reviewer ?? undefined }),
    closedAt: terminal ? (options.previousClosedAt ?? now) : undefined,
    updatedAt: now,
    lastActivityAt: now,
  });
  if (options.actor && options.before) {
    const before = options.before;
    recordTicketEvent({ ticketId, kind: "edited", actor: options.actor, at: now });
    if (before.status !== input.status) {
      recordTicketEvent({ ticketId, kind: "status", actor: options.actor, at: now });
    }
    if (options.assignee !== undefined) {
      recordTicketEvent({
        ticketId,
        kind: "assigned",
        actor: options.actor,
        subject: options.assignee?.user,
        at: now,
      });
    }
    if (options.reviewer !== undefined) {
      recordTicketEvent({
        ticketId,
        kind: "reviewer",
        actor: options.actor,
        subject: options.reviewer?.user,
        at: now,
      });
    }
  }
}

/** Taking an open ticket from its dossier: the member becomes the assignee.
 * The ladder gate lives in the panel — the store only lands the patch. */
export function assignTicket(
  ticketId: string,
  assignee: TicketPerson,
  project?: TicketProject,
): void {
  const now = new Date().toISOString();
  const reviewer = project ? nextProjectReviewer(project, assignee.user) : null;
  patchTicket(
    ticketId,
    {
      assignee,
      ...(project
        ? { reviewer: reviewer ? { user: reviewer, avatar: avatarFor(reviewer) } : undefined }
        : {}),
      updatedAt: now,
      lastActivityAt: now,
    },
    reviewer && project ? { project: project.slug, reviewer } : undefined,
  );
  recordTicketEvent({
    ticketId,
    kind: "claimed",
    actor: assignee.user,
    subject: assignee.user,
    at: now,
  });
  if (reviewer) {
    recordTicketEvent({
      ticketId,
      kind: "reviewer",
      actor: assignee.user,
      subject: reviewer,
      at: now,
    });
  }
}

/** Rebuild the queue from the current snapshot at commit time. Two rapid
 * claims in one mock session cannot both pass the one-active-task check. */
export function tryClaimTicket(
  ticketId: string,
  actor: TicketActor,
  project: TicketProject,
  baseTickets: readonly Ticket[],
): ClaimBlock | null {
  if (!actor) return "login";
  const all = mergedTickets(baseTickets, state);
  const ticket = all.find((entry) => entry.id === ticketId);
  if (!ticket) return "status";
  const blocked = claimBlock(actor, ticket, all, project);
  if (blocked) return blocked;
  assignTicket(ticketId, { user: actor.user, avatar: avatarFor(actor.user) }, project);
  return null;
}

/** Leaving a ticket from its dossier: always allowed, no questions asked. */
export function leaveTicket(ticketId: string, actor?: string): void {
  patchTicket(ticketId, {
    assignee: undefined,
    reviewer: undefined,
    updatedAt: new Date().toISOString(),
  });
  if (actor) recordTicketEvent({ ticketId, kind: "left", actor, at: new Date().toISOString() });
}

/** A comment posted in this session, appended to the fixture ones. */
export function addTicketComment(
  ticketId: string,
  comment: Omit<TicketComment, "id">,
  meaningfulWork = false,
): TicketComment {
  const entry: TicketComment = { ...comment, id: localId(LOCAL_COMMENT_ID_PREFIX) };
  const current = state.patches[ticketId]?.comments ?? [];
  patchTicket(ticketId, {
    comments: [...current, entry],
    updatedAt: entry.createdAt,
    ...(meaningfulWork ? { lastActivityAt: entry.createdAt } : {}),
  });
  recordTicketEvent({
    ticketId,
    kind: "commented",
    actor: comment.author.user,
    at: entry.createdAt,
  });
  return entry;
}

/** The author's edit of a comment (fixture or session): the body is replaced
 * in the merge, the mark reads `editedAt`. */
export function editTicketComment(
  ticketId: string,
  commentId: string,
  body: string,
  actor?: string,
): void {
  const current = state.patches[ticketId]?.commentEdits ?? {};
  patchTicket(ticketId, {
    commentEdits: { ...current, [commentId]: { body, editedAt: new Date().toISOString() } },
  });
  if (actor)
    recordTicketEvent({ ticketId, kind: "comment-edited", actor, at: new Date().toISOString() });
}

/** The author's delete: the comment stays in the list as a tombstone. */
export function deleteTicketComment(ticketId: string, commentId: string, actor?: string): void {
  const current = state.patches[ticketId]?.deletedComments ?? {};
  patchTicket(ticketId, {
    deletedComments: { ...current, [commentId]: new Date().toISOString() },
  });
  if (actor)
    recordTicketEvent({ ticketId, kind: "comment-deleted", actor, at: new Date().toISOString() });
}

/** The full blocked-by list after an add or a remove: the form computes it
 * from the live ticket, so removals can drop fixture blockers too. */
export function setTicketBlockers(
  ticketId: string,
  blockedBy: readonly string[],
  actor?: string,
): void {
  patchTicket(ticketId, { blockedBy });
  if (actor) recordTicketEvent({ ticketId, kind: "blockers", actor, at: new Date().toISOString() });
}

/** Concatenates two id-keyed lists without repeating ids: the session's merge
 * stays idempotent, so a consumer that already holds a merged ticket may feed
 * it back through withSessionState. */
function mergeById<T extends { id: string }>(base: readonly T[], extra: readonly T[]): T[] {
  if (extra.length === 0) return [...base];
  const known = new Set(base.map((entry) => entry.id));
  return [...base, ...extra.filter((entry) => !known.has(entry.id))];
}

/** A comment with the session's edit or tombstone applied. */
function commentWithSessionState(
  comment: TicketComment,
  edits: Readonly<Record<string, { body: string; editedAt: string }>>,
  deleted: Readonly<Record<string, string>>,
): TicketComment {
  const edit = edits[comment.id];
  const deletedAt = deleted[comment.id];
  if (edit === undefined && deletedAt === undefined) return comment;
  return {
    ...comment,
    ...(edit === undefined ? {} : { body: edit.body, editedAt: edit.editedAt }),
    ...(deletedAt === undefined ? {} : { deletedAt }),
  };
}

/** A ticket with the session's links, status, assignee, blockers and comments
 * applied. The base ticket is never mutated and the merge is idempotent (the
 * ids de-duplicate), so reapplying it to an already-merged ticket is safe. The
 * store-only keys (comment edits and tombstones) stay out of the merged
 * ticket. */
export function withSessionState(ticket: Ticket, watched: TicketsState): Ticket {
  const links = watched.sessionLinks[ticket.id];
  const removed = watched.removedLinks[ticket.id] ?? [];
  const patch = watched.patches[ticket.id];
  const hasLinks = links !== undefined && links.length > 0;
  if (!hasLinks && removed.length === 0 && patch === undefined) return ticket;
  const {
    comments: addedComments,
    commentEdits = {},
    deletedComments = {},
    ...fields
  } = patch ?? {};
  const session = links ?? [];
  const merged = mergeById(ticket.links, session).filter((entry) => !removed.includes(entry.id));
  return {
    ...ticket,
    ...fields,
    links: merged,
    comments: mergeById(ticket.comments, addedComments ?? []).map((comment) =>
      commentWithSessionState(comment, commentEdits, deletedComments),
    ),
  };
}

/** The whole queue the tracker and the dossier resolve against: the composed
 * tickets and the fixtures, both with the session's edits. Idempotent, like
 * withSessionState, so an already-merged list may be fed back in. */
export function mergedTickets(tickets: readonly Ticket[], watched: TicketsState): Ticket[] {
  return [
    ...watched.addedTickets.map((ticket) => withSessionState(ticket, watched)),
    ...tickets.map((ticket) => withSessionState(ticket, watched)),
  ];
}
