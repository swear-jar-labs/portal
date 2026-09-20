import {
  nextTicketKey,
  type Ticket,
  type TicketComment,
  type TicketLink,
  type TicketPerson,
  type TicketPriority,
} from "./tickets";
import type { TicketComposeInput } from "./schema";

// The tickets' session memory: the mock state outlives the route remount (the
// tracker unmounts when a dossier opens) and dies with the page reload. The
// store owns its transitions as methods — the components call them through
// useTicketSession. Phase 5 replaces these methods with server actions.

// The fields a session action may change on any ticket (fixture or composed);
// comments are additive and live in their own key.
export type TicketPatch = Partial<
  Pick<Ticket, "status" | "assignee" | "closedAt" | "updatedAt" | "blockedBy" | "priority">
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
  // The session's edits over any ticket: status, assignee, blockers, comments.
  patches: Readonly<Record<string, TicketPatch>>;
};

const INITIAL_TICKETS_STATE: TicketsState = {
  addedTickets: [],
  sessionLinks: {},
  patches: {},
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

function patchTicket(ticketId: string, patch: TicketPatch): void {
  const current = state.patches[ticketId] ?? {};
  setState({ ...state, patches: { ...state.patches, [ticketId]: { ...current, ...patch } } });
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
  };
  setState({ ...state, addedTickets: [...state.addedTickets, ticket] });
  return ticket;
}

/** A link pinned to a ticket in this session. The mock mirrors the database's
 * `unique (ticket_id, url)`: pinning a known url returns the existing link. */
export function addTicketLink(ticketId: string, link: Omit<TicketLink, "id">): TicketLink {
  const current = state.sessionLinks[ticketId] ?? [];
  const existing = current.find((entry) => entry.url === link.url);
  if (existing !== undefined) return existing;
  const pinned: TicketLink = { ...link, id: localId(LOCAL_LINK_ID_PREFIX) };
  setState({
    ...state,
    sessionLinks: { ...state.sessionLinks, [ticketId]: [...current, pinned] },
  });
  return pinned;
}

/** START: the ticket goes in progress and the starter takes it (RULES §15:
 * claim is open to everyone; the mock has no roles yet). */
export function startTicket(ticketId: string, assignee: TicketPerson): void {
  patchTicket(ticketId, { status: "in_progress", assignee, updatedAt: new Date().toISOString() });
}

export function sendTicketToReview(ticketId: string): void {
  patchTicket(ticketId, { status: "review", updatedAt: new Date().toISOString() });
}

export function finishTicket(ticketId: string): void {
  const now = new Date().toISOString();
  patchTicket(ticketId, { status: "done", closedAt: now, updatedAt: now });
}

/** CLOSE cancels the work; `closed` is terminal, like `done`. */
export function closeTicket(ticketId: string): void {
  const now = new Date().toISOString();
  patchTicket(ticketId, { status: "closed", closedAt: now, updatedAt: now });
}

/** A comment posted in this session, appended to the fixture ones. */
export function addTicketComment(
  ticketId: string,
  comment: Omit<TicketComment, "id">,
): TicketComment {
  const entry: TicketComment = { ...comment, id: localId(LOCAL_COMMENT_ID_PREFIX) };
  const current = state.patches[ticketId]?.comments ?? [];
  patchTicket(ticketId, { comments: [...current, entry], updatedAt: entry.createdAt });
  return entry;
}

/** The author's edit of a comment (fixture or session): the body is replaced
 * in the merge, the mark reads `editedAt`. */
export function editTicketComment(ticketId: string, commentId: string, body: string): void {
  const current = state.patches[ticketId]?.commentEdits ?? {};
  patchTicket(ticketId, {
    commentEdits: { ...current, [commentId]: { body, editedAt: new Date().toISOString() } },
  });
}

/** The author's delete: the comment stays in the list as a tombstone. */
export function deleteTicketComment(ticketId: string, commentId: string): void {
  const current = state.patches[ticketId]?.deletedComments ?? {};
  patchTicket(ticketId, {
    deletedComments: { ...current, [commentId]: new Date().toISOString() },
  });
}

/** The full blocked-by list after an add or a remove: the form computes it
 * from the live ticket, so removals can drop fixture blockers too. */
export function setTicketBlockers(ticketId: string, blockedBy: readonly string[]): void {
  patchTicket(ticketId, { blockedBy });
}

/** The queue order is the maintainer's call (Phase 5); the mock lets any
 * member set it. The update stamp stays put: priority is queue metadata. */
export function setTicketPriority(ticketId: string, priority: TicketPriority): void {
  patchTicket(ticketId, { priority });
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
 * applied. The base ticket is never mutated: merging a merged ticket would
 * double its session comments. The store-only keys (comment edits and
 * tombstones) stay out of the merged ticket. */
export function withSessionState(ticket: Ticket, watched: TicketsState): Ticket {
  const links = watched.sessionLinks[ticket.id];
  const patch = watched.patches[ticket.id];
  const hasLinks = links !== undefined && links.length > 0;
  if (!hasLinks && patch === undefined) return ticket;
  const {
    comments: addedComments,
    commentEdits = {},
    deletedComments = {},
    ...fields
  } = patch ?? {};
  return {
    ...ticket,
    ...fields,
    links: hasLinks ? [...ticket.links, ...links] : ticket.links,
    comments: [...ticket.comments, ...(addedComments ?? [])].map((comment) =>
      commentWithSessionState(comment, commentEdits, deletedComments),
    ),
  };
}

/** The whole queue the tracker and the dossier resolve against: the composed
 * tickets plus the fixtures with the session's edits. */
export function mergedTickets(tickets: readonly Ticket[], watched: TicketsState): Ticket[] {
  return [...watched.addedTickets, ...tickets.map((ticket) => withSessionState(ticket, watched))];
}
