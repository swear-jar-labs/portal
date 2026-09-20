// UI-first tickets data: fixtures and the async getters over them. The
// tickets pages consume them; when the backend lands (Phase 5), the bodies
// change to queries while the signatures stay put (TECH.md §5).

import { avatarFor } from "@/shared/members";
import {
  sortTickets,
  type ProjectSlug,
  type Ticket,
  type TicketComment,
  type TicketLink,
  type TicketPerson,
} from "./tickets";

const ada: TicketPerson = { user: "ada", avatar: avatarFor("ada") };
const grace: TicketPerson = { user: "grace", avatar: avatarFor("grace") };
const ken: TicketPerson = { user: "ken" };
const lin: TicketPerson = { user: "lin" };

function link(
  id: string,
  kind: TicketLink["kind"],
  url: string,
  label: string,
  addedBy: TicketPerson,
): TicketLink {
  return { id, kind, url, label, addedBy };
}

function comment(id: string, author: TicketPerson, createdAt: string, body: string): TicketComment {
  return { id, author, createdAt, body };
}

type FixtureTicketInput = Pick<
  Ticket,
  | "key"
  | "project"
  | "title"
  | "body"
  | "status"
  | "size"
  | "tags"
  | "author"
  | "createdAt"
  | "updatedAt"
> &
  Partial<Pick<Ticket, "assignee" | "closedAt" | "links" | "comments" | "blockedBy" | "priority">>;

function fixtureTicket(input: FixtureTicketInput): Ticket {
  return {
    id: `ticket-${input.key.toLowerCase()}`,
    links: [],
    comments: [],
    blockedBy: [],
    priority: "normal",
    ...input,
  };
}

const tickets: readonly Ticket[] = [
  fixtureTicket({
    key: "DOS-1",
    project: "swearjar-dos",
    title: "Honour the CRT glow before first paint",
    body: "The boot flashes white for a frame before the CRT overlay settles. Hold the first paint behind the overlay: the glow is the brand, the flash is a bug.",
    status: "open",
    size: "M",
    priority: "high",
    tags: ["feature"],
    author: grace,
    assignee: ada,
    links: [
      link(
        "dos-1-pr-42",
        "pr",
        "https://github.com/swear-jar-labs/portal/pull/42",
        "Fix first-paint flash",
        ada,
      ),
    ],
    comments: [
      comment(
        "dos-1-c1",
        grace,
        "2026-09-12T10:00:00.000Z",
        "Reproduced on a cold load with cache disabled. One frame, then the overlay wins.",
      ),
      comment(
        "dos-1-c2",
        ada,
        "2026-09-13T08:30:00.000Z",
        "Taking it: the fix belongs in the boot path, not in the panel CSS.",
      ),
    ],
    createdAt: "2026-09-10T09:00:00.000Z",
    updatedAt: "2026-09-18T09:00:00.000Z",
  }),
  fixtureTicket({
    key: "DOS-2",
    project: "swearjar-dos",
    title: "KeyBar clock drifts under parallel load",
    body: "With four e2e workers the command-bar clock visibly lags the wall clock. The tick source should survive timer throttling, or the clock should admit it is decorative.",
    status: "in_progress",
    size: "S",
    tags: ["bug"],
    author: ada,
    assignee: ken,
    comments: [
      comment(
        "dos-2-c1",
        ken,
        "2026-09-16T14:00:00.000Z",
        "Claimed. First suspect: the interval is created per render instead of once.",
      ),
    ],
    createdAt: "2026-09-11T09:00:00.000Z",
    updatedAt: "2026-09-17T08:20:00.000Z",
  }),
  fixtureTicket({
    key: "DOS-3",
    project: "swearjar-dos",
    title: "Table contract for the tickets tracker",
    body: "The tracker uses the shared table with ticket columns. Pin the contract before the slice: KEY links to the dossier, STATUS reads as a chip, the rest stays text. The readroom's bump-allocator cycle reads this code next.",
    status: "review",
    size: "M",
    tags: ["feature"],
    author: ada,
    assignee: grace,
    links: [
      link(
        "dos-3-pr-51",
        "pr",
        "https://github.com/swear-jar-labs/portal/pull/51",
        "Tickets tracker on Table",
        grace,
      ),
      link(
        "dos-3-diff-1",
        "diff",
        "https://github.com/swear-jar-labs/portal/pull/51/files",
        "Tracker diff under review",
        ada,
      ),
    ],
    comments: [
      comment(
        "dos-3-c1",
        ada,
        "2026-09-15T11:00:00.000Z",
        "Ready for peer review: the column contract is the part I want a second pair of eyes on.",
      ),
    ],
    createdAt: "2026-09-09T09:00:00.000Z",
    updatedAt: "2026-09-16T06:05:00.000Z",
  }),
  fixtureTicket({
    key: "CMP-1",
    project: "compiler",
    title: "A REPL for the recursive-descent playground",
    body: "Grammars you can debug at 3am deserve a prompt you can type into. Line editing first, history second, pretty errors always. A large one: claim only with a track record.",
    status: "open",
    size: "L",
    tags: ["feature"],
    author: grace,
    createdAt: "2026-09-08T09:00:00.000Z",
    updatedAt: "2026-09-12T09:00:00.000Z",
  }),
  fixtureTicket({
    key: "CMP-2",
    project: "compiler",
    title: "Good first slice: token pretty-printer",
    body: "Print the token stream one per line with kinds aligned in a column. No parsing, no errors, just the lexer made legible. A good first commit for a newcomer.",
    status: "open",
    size: "S",
    tags: ["good-first"],
    author: grace,
    // The REPL comes first: the pretty-printer waits for it.
    blockedBy: ["ticket-cmp-1"],
    createdAt: "2026-09-14T09:00:00.000Z",
    updatedAt: "2026-09-15T09:00:00.000Z",
  }),
  fixtureTicket({
    key: "TOOL-1",
    project: "tooling",
    title: "CI cache poison guard",
    body: "A poisoned build cache shipped a green build once. The guard hashes the inputs before restoring: mismatch means a cold build, loudly. Merged after peer review.",
    status: "done",
    size: "S",
    tags: ["bug"],
    author: lin,
    assignee: lin,
    links: [
      link(
        "tool-1-commit-1",
        "commit",
        "https://gitlab.com/swear-jar-labs/tooling/-/commit/9f2c1a",
        "Hash cache inputs before restore",
        lin,
      ),
    ],
    createdAt: "2026-09-06T09:00:00.000Z",
    updatedAt: "2026-09-14T09:00:00.000Z",
    closedAt: "2026-09-14T09:00:00.000Z",
  }),
  fixtureTicket({
    key: "TOOL-2",
    project: "tooling",
    title: "Shell script lint gate",
    body: "Every shell script in the repo passes shellcheck before merge. The gate runs in CI and locally via one command. Under review with a sample violation fixed alongside.",
    status: "review",
    size: "S",
    tags: ["testing"],
    author: ada,
    assignee: lin,
    links: [
      link(
        "tool-2-commit-1",
        "commit",
        "https://gitlab.com/swear-jar-labs/tooling/-/commit/41bd77",
        "Add shellcheck gate",
        lin,
      ),
    ],
    createdAt: "2026-09-07T09:00:00.000Z",
    updatedAt: "2026-09-16T09:00:00.000Z",
  }),
  fixtureTicket({
    key: "CACHE-1",
    project: "token-cache",
    title: "LRU recency postmortem",
    body: "The cache learned about recency the hard way; this ticket kept the notes while it did. Frozen with the archive: read, don't revive.",
    status: "closed",
    size: "S",
    tags: ["docs"],
    author: ken,
    assignee: ken,
    createdAt: "2026-07-21T09:00:00.000Z",
    updatedAt: "2026-08-30T14:00:00.000Z",
    closedAt: "2026-09-01T09:00:00.000Z",
  }),
  fixtureTicket({
    key: "FLAG-1",
    project: "flagship",
    title: "Flagship charter and poll",
    body: "One real project, chosen by poll, built by hand. This ticket tracks the charter: scope, stack options and the poll itself. No repository yet.",
    status: "open",
    size: "M",
    tags: ["good-first"],
    author: grace,
    createdAt: "2026-09-18T09:00:00.000Z",
    updatedAt: "2026-09-18T09:00:00.000Z",
  }),
  fixtureTicket({
    key: "DOS-4",
    project: "swearjar-dos",
    title: "Keep the focus ring below sticky headers",
    body: "A focused row can slide under a sticky table header and leave its ring painted above the heading. Clip the ring to the scrolling viewport without hiding it at the edge.",
    status: "open",
    size: "S",
    tags: ["bug"],
    author: ken,
    // The blocker is still in review: DOS-4 cannot start yet.
    blockedBy: ["ticket-dos-3"],
    createdAt: "2026-09-13T10:00:00.000Z",
    updatedAt: "2026-09-15T18:00:00.000Z",
  }),
  fixtureTicket({
    key: "DOS-5",
    project: "swearjar-dos",
    title: "Normalize focus return across panel layers",
    body: "Closing a dossier, member card or compose layer should return focus through one explicit contract. Remove the remaining per-screen guesses.",
    status: "in_progress",
    size: "M",
    tags: ["refactor"],
    author: ada,
    assignee: grace,
    createdAt: "2026-09-12T09:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
  }),
  fixtureTicket({
    key: "DOS-6",
    project: "swearjar-dos",
    title: "Document the panel keyboard map",
    body: "Write down entry, row walking, horizontal control walking and escape behavior so new screens follow the same keyboard model.",
    status: "done",
    size: "S",
    tags: ["docs"],
    author: lin,
    assignee: lin,
    createdAt: "2026-09-05T09:00:00.000Z",
    updatedAt: "2026-09-10T16:00:00.000Z",
    closedAt: "2026-09-10T16:00:00.000Z",
  }),
  fixtureTicket({
    key: "CMP-3",
    project: "compiler",
    title: "Recover after a malformed expression",
    body: "The parser should report one useful error and resume at a statement boundary instead of turning the rest of the file into noise.",
    status: "in_progress",
    size: "M",
    priority: "high",
    tags: ["bug"],
    author: grace,
    assignee: ada,
    createdAt: "2026-09-10T09:00:00.000Z",
    updatedAt: "2026-09-14T18:00:00.000Z",
  }),
  fixtureTicket({
    key: "CMP-4",
    project: "compiler",
    title: "Golden tests for Unicode escapes",
    body: "Pin valid and invalid escapes as golden lexer output, including truncated code points and characters outside the scalar range.",
    status: "review",
    size: "S",
    tags: ["testing"],
    author: ada,
    assignee: ken,
    createdAt: "2026-09-09T09:00:00.000Z",
    updatedAt: "2026-09-13T14:00:00.000Z",
  }),
  fixtureTicket({
    key: "CMP-5",
    project: "compiler",
    title: "Write the Pratt parser design notes",
    body: "Capture binding powers, associativity and error recovery decisions next to the implementation before the experiment becomes folklore.",
    status: "done",
    size: "L",
    tags: ["docs"],
    author: grace,
    assignee: grace,
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-11T11:00:00.000Z",
    closedAt: "2026-09-11T11:00:00.000Z",
  }),
  fixtureTicket({
    key: "TOOL-3",
    project: "tooling",
    title: "Reproducible local CI runner",
    body: "One command should run the same checks and environment image as CI so a red remote build is not the first useful signal.",
    status: "open",
    size: "M",
    tags: ["feature"],
    author: lin,
    // A finished blocker: the link stays as history, the gate is open.
    blockedBy: ["ticket-tool-1"],
    createdAt: "2026-09-08T09:00:00.000Z",
    updatedAt: "2026-09-13T08:00:00.000Z",
  }),
  fixtureTicket({
    key: "TOOL-4",
    project: "tooling",
    title: "Generate the dependency license manifest",
    body: "Produce a deterministic license inventory in CI and fail when a dependency arrives without an approved license classification.",
    status: "in_progress",
    size: "S",
    priority: "low",
    tags: ["docs"],
    author: ada,
    assignee: lin,
    createdAt: "2026-09-07T09:00:00.000Z",
    updatedAt: "2026-09-12T16:00:00.000Z",
  }),
  fixtureTicket({
    key: "CACHE-2",
    project: "token-cache",
    title: "Expose the eviction trace in debug builds",
    body: "A compact trace of hits, promotions and evictions makes the archived cache behavior reproducible without adding production overhead.",
    status: "closed",
    size: "M",
    tags: ["feature"],
    author: ken,
    assignee: ken,
    createdAt: "2026-08-10T09:00:00.000Z",
    updatedAt: "2026-08-29T12:00:00.000Z",
    closedAt: "2026-08-29T12:00:00.000Z",
  }),
  fixtureTicket({
    key: "FLAG-2",
    project: "flagship",
    title: "Publish the voting eligibility notes",
    body: "State who can vote, when the roll closes and how ties are handled before the flagship poll opens.",
    status: "open",
    size: "S",
    priority: "low",
    tags: ["docs"],
    author: grace,
    createdAt: "2026-09-15T09:00:00.000Z",
    updatedAt: "2026-09-17T12:00:00.000Z",
  }),
  fixtureTicket({
    key: "FLAG-3",
    project: "flagship",
    title: "Record build constraints for the shortlist",
    body: "Each candidate needs a bounded first milestone, a runnable artifact and enough room for contributors to work independently.",
    status: "review",
    size: "M",
    tags: ["feature"],
    author: grace,
    assignee: ada,
    createdAt: "2026-09-13T09:00:00.000Z",
    updatedAt: "2026-09-16T12:00:00.000Z",
  }),
];

const byKey = new Map<string, Ticket>(tickets.map((ticket) => [ticket.key, ticket]));

/** Every fixture ticket, freshest update first (the tracker order). */
export async function listTickets(): Promise<Ticket[]> {
  return sortTickets(tickets);
}

/** A ticket by its human key (DOS-12), or null for an unknown key. */
export async function getTicketByKey(key: string): Promise<Ticket | null> {
  return byKey.get(key) ?? null;
}

/** A project's tickets for its page section, freshest update first. */
export async function listTicketsByProject(project: ProjectSlug): Promise<Ticket[]> {
  return sortTickets(tickets.filter((ticket) => ticket.project === project));
}
