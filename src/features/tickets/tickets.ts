// The tickets' model: types, taxonomy, the URL canon and the pure helpers
// the slice shares. Fixtures and getters live in ./data; the contract manifest
// (contracts/index.ts) re-exports what other features consume.

import type { Tone } from "@swearjar/dos";
import { projectSlugs, type ProjectSlug } from "@/features/projects/contracts";
export type { ProjectSlug } from "@/features/projects/contracts";

// The work queue reads as a chip; done and closed are neutral.
export const ticketStatuses = ["open", "in_progress", "review", "done", "closed"] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

export const ticketStatusTones: Partial<Record<TicketStatus, Tone>> = {
  open: "green",
  in_progress: "cyan",
  review: "yellow",
};

export function isTicketStatus(value: string): value is TicketStatus {
  return ticketStatuses.some((status) => status === value);
}

// The size flag from RULES §15: S/M/L on every ticket, `good-first` as a tag.
export const ticketSizes = ["S", "M", "L"] as const;
export type TicketSize = (typeof ticketSizes)[number];

export function isTicketSize(value: string): value is TicketSize {
  return ticketSizes.some((size) => size === value);
}

// The ticket vocabulary: kinds of work, not board topics. `good-first` marks
// the simple entries open to contributors without a track record.
export const ticketTagIds = [
  "good-first",
  "bug",
  "feature",
  "docs",
  "refactor",
  "testing",
] as const;
export type TicketTagId = (typeof ticketTagIds)[number];

export const ticketTagTones: Partial<Record<TicketTagId, Tone>> = {
  "good-first": "green",
  bug: "yellow",
};

export function isTicketTagId(value: string): value is TicketTagId {
  return ticketTagIds.some((id) => id === value);
}

// The structural code pool (readroom-ticket-links): PR, commit, file or diff
// instead of parsing the body for links.
export const ticketLinkKinds = ["pr", "commit", "file", "diff"] as const;
export type TicketLinkKind = (typeof ticketLinkKinds)[number];

export type TicketPerson = {
  user: string;
  avatar?: string;
};

export type TicketLink = {
  id: string;
  kind: TicketLinkKind;
  url: string;
  label: string;
  revision?: string;
  addedBy: TicketPerson;
};

export type TicketComment = {
  id: string;
  author: TicketPerson;
  body: string;
  createdAt: string;
};

export type Ticket = {
  id: string;
  // The human key (DOS-12): the dossier route and the readroom chip read it.
  // UUID stays the PK; Phase 5 generates the key per project (serial).
  key: string;
  project: ProjectSlug;
  title: string;
  // Markdown on the dossier; the tracker row shows the title only.
  body: string;
  status: TicketStatus;
  size: TicketSize;
  tags: readonly TicketTagId[];
  author: TicketPerson;
  assignee?: TicketPerson;
  links: readonly TicketLink[];
  comments: readonly TicketComment[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
};

// The key canon: PREFIX-seq, the prefix pinned per project below. Phase 5
// keeps the shape and generates the sequence.
export const projectKeyPrefixes: Record<ProjectSlug, string> = {
  "swearjar-dos": "DOS",
  compiler: "CMP",
  tooling: "TOOL",
  "token-cache": "CACHE",
  flagship: "FLAG",
};

const TICKET_KEY_PATTERN = /^([A-Z]{2,8})-(\d+)$/;

export function isTicketKey(value: string): boolean {
  return TICKET_KEY_PATTERN.test(value);
}

export function parseTicketKey(key: string): { prefix: string; seq: number } | null {
  const match = TICKET_KEY_PATTERN.exec(key);
  if (!match) return null;
  const prefix = match[1];
  const sequence = match[2];
  if (prefix === undefined || sequence === undefined) return null;
  return { prefix, seq: Number(sequence) };
}

/** The next free key of a project: its prefix plus one past the max sequence
 * in the given tickets (fixtures and the session's composed ones). */
export function nextTicketKey(project: ProjectSlug, tickets: readonly Ticket[]): string {
  const prefix = projectKeyPrefixes[project];
  const seq = tickets.reduce((max, ticket) => {
    const parsed = parseTicketKey(ticket.key);
    if (parsed === null || parsed.prefix !== prefix) return max;
    return Math.max(max, parsed.seq);
  }, 0);
  return `${prefix}-${seq + 1}`;
}

// The tickets' URL canon: the tracker and the dossier build links from it.
// (Moved here from readrooms.ts with the slice: the readroom chip was its
// first consumer.)
export const TICKETS_PATH = "/tickets";
export const ticketPath = (key: string) => `${TICKETS_PATH}/${key}`;

// The tracker row's contract attribute: the stack marks its rows for focus
// return, the same way board and project cards do.
export const TICKETS_ROW_ATTR = "data-tickets-row";

// The row anchor: closing the dossier hands the keyboard back to it.
export const ticketRowId = (key: string) => `ticket-row-${key}`;

export const composeButtonId = "tickets-compose-button";

export type TicketQuery = {
  project: ProjectSlug | "all";
  size: TicketSize | "all";
  status: TicketStatus | "all";
  assignee: "all" | "none";
  tag: TicketTagId | "all";
  q: string;
};

export const DEFAULT_TICKET_QUERY: TicketQuery = {
  project: "all",
  size: "all",
  status: "all",
  assignee: "all",
  tag: "all",
  q: "",
};

// The fallback project of a compose form opened without context: the registry's
// first slug, never a literal in the component.
export const DEFAULT_TICKET_PROJECT: ProjectSlug = projectSlugs[0];

function firstParam(
  source: URLSearchParams | Readonly<Record<string, string | string[] | undefined>>,
  name: string,
): string | null {
  if (source instanceof URLSearchParams) return source.get(name);
  const value = source[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** The tracker filters from the address bar: unknown values fall back to the
 * defaults, so a hand-typed query never empties the table by accident. */
export function parseTicketQuery(
  source: URLSearchParams | Readonly<Record<string, string | string[] | undefined>>,
  isProject: (value: string) => value is ProjectSlug,
): TicketQuery {
  const project = firstParam(source, "project");
  const size = firstParam(source, "size");
  const status = firstParam(source, "status");
  const assignee = firstParam(source, "assignee");
  const tag = firstParam(source, "tag");
  const q = firstParam(source, "q");
  return {
    project: project !== null && isProject(project) ? project : "all",
    size: size !== null && isTicketSize(size) ? size : "all",
    status: status !== null && isTicketStatus(status) ? status : "all",
    assignee: assignee === "none" ? "none" : "all",
    tag: tag !== null && isTicketTagId(tag) ? tag : "all",
    q: q ?? "",
  };
}

/** The deep-linkable address of a query: defaults stay out of the URL. */
export function ticketQueryParams(query: TicketQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.project !== "all") params.set("project", query.project);
  if (query.size !== "all") params.set("size", query.size);
  if (query.status !== "all") params.set("status", query.status);
  if (query.assignee !== "all") params.set("assignee", query.assignee);
  if (query.tag !== "all") params.set("tag", query.tag);
  if (query.q !== "") params.set("q", query.q);
  return params;
}

/** The default view: no filter set, so the address carries no params. */
export function isDefaultTicketQuery(query: TicketQuery): boolean {
  return ticketQueryParams(query).size === 0;
}

function matchesAssignee(ticket: Ticket, assignee: TicketQuery["assignee"]): boolean {
  if (assignee === "all") return true;
  return ticket.assignee === undefined;
}

function matchesText(ticket: Ticket, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (needle === "") return true;
  return (
    ticket.title.toLowerCase().includes(needle) ||
    ticket.key.toLowerCase().includes(needle) ||
    ticket.assignee?.user.toLowerCase().includes(needle) === true
  );
}

/** The tracker's pure filter: project, status, assignee, tag and text. */
export function filterTickets(tickets: readonly Ticket[], query: TicketQuery): Ticket[] {
  return tickets.filter(
    (ticket) =>
      (query.project === "all" || ticket.project === query.project) &&
      (query.size === "all" || ticket.size === query.size) &&
      (query.status === "all" || ticket.status === query.status) &&
      matchesAssignee(ticket, query.assignee) &&
      (query.tag === "all" || ticket.tags.includes(query.tag)) &&
      matchesText(ticket, query.q),
  );
}

/** The tracker order: the freshest update first, the key breaks the tie. */
export function sortTickets(tickets: readonly Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const fresh = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    if (fresh !== 0) return fresh;
    if (a.key === b.key) return 0;
    return a.key < b.key ? -1 : 1;
  });
}
