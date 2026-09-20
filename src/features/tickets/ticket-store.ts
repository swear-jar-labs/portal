import { nextTicketKey, type Ticket, type TicketLink, type TicketPerson } from "./tickets";
import type { TicketComposeInput } from "./schema";

// The tickets' session memory: the mock state outlives the route remount (the
// tracker unmounts when a dossier opens) and dies with the page reload. The
// store owns its transitions as methods — the components call them through
// useTicketSession. Phase 5 replaces these methods with server actions.

export type TicketsState = {
  addedTickets: readonly Ticket[];
  // Links pinned to fixture tickets in this session (composed tickets carry
  // their own, empty, list).
  sessionLinks: Readonly<Record<string, readonly TicketLink[]>>;
};

const INITIAL_TICKETS_STATE: TicketsState = {
  addedTickets: [],
  sessionLinks: {},
};

const LOCAL_TICKET_ID_PREFIX = "local-ticket-";
const LOCAL_LINK_ID_PREFIX = "local-link-";

function localId(prefix: string): string {
  return `${prefix}${crypto.randomUUID()}`;
}

let state: TicketsState = INITIAL_TICKETS_STATE;
const listeners = new Set<() => void>();

function setState(next: TicketsState): void {
  state = next;
  for (const listener of listeners) listener();
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
    tags: [...input.tags],
    author,
    links: [],
    comments: [],
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

/** A ticket with its session links attached (fixture tickets only; composed
 * tickets carry theirs inline). */
export function withSessionLinks(ticket: Ticket, watched: TicketsState): Ticket {
  const extra = watched.sessionLinks[ticket.id];
  if (extra === undefined || extra.length === 0) return ticket;
  return { ...ticket, links: [...ticket.links, ...extra] };
}
