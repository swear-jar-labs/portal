import { beforeEach, describe, expect, it, vi } from "vitest";
import * as store from "@/features/tickets/ticket-store";
import type { TicketComposeInput, TicketEditInput } from "@/features/tickets/schema";
import type { Ticket } from "@/features/tickets/tickets";

const ada = { user: "ada" };
const known: Ticket[] = [];

const base: Ticket = {
  id: "ticket-dos-1",
  key: "DOS-1",
  project: "swearjar-dos",
  title: "A ticket",
  body: "Do the work.",
  status: "open",
  size: "S",
  priority: "normal",
  tags: [],
  author: ada,
  links: [],
  comments: [],
  blockedBy: [],
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const draft: TicketEditInput = {
  title: "A ticket",
  body: "Do the work.",
  size: "S",
  priority: "normal",
  status: "open",
  tags: [],
};

function live(ticket: Ticket = base): Ticket {
  return store.withSessionState(ticket, store.ticketsSnapshot());
}

beforeEach(() => store.resetTicketsStore());

describe("ticket store", () => {
  it("composes sequential session tickets and keeps the server snapshot empty", () => {
    const input: TicketComposeInput = {
      project: "compiler",
      title: "A parser",
      body: "Build it.",
      size: "S",
      priority: "high",
      tags: ["good-first"],
    };
    expect(store.addTicket(input, ada, known).key).toBe("CMP-1");
    expect(store.addTicket(input, ada, store.ticketsSnapshot().addedTickets).key).toBe("CMP-2");
    expect(store.addTicket(input, ada, store.ticketsSnapshot().addedTickets).priority).toBe("high");
    expect(store.ticketsServerSnapshot().addedTickets).toEqual([]);
  });

  it("pins a link to one ticket and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribeTickets(listener);
    const link = store.addTicketLink("ticket-1", {
      kind: "pr",
      url: "https://example.com/pr/1",
      label: "PR 1",
      addedBy: ada,
    });
    expect(store.ticketsSnapshot().sessionLinks["ticket-1"]).toEqual([link]);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("keeps one link per url (the unique invariant of ticket_links)", () => {
    const first = store.addTicketLink("ticket-1", {
      kind: "pr",
      url: "https://example.com/pr/1",
      label: "PR 1",
      addedBy: ada,
    });
    const again = store.addTicketLink("ticket-1", {
      kind: "commit",
      url: "https://example.com/pr/1",
      label: "PR one, again",
      addedBy: ada,
    });
    expect(again).toBe(first);
    expect(store.ticketsSnapshot().sessionLinks["ticket-1"]).toEqual([first]);
  });

  it("edits the editor's fields, status and update stamp in one patch", () => {
    store.editTicket(base.id, {
      title: "Renamed",
      body: "A new body.",
      size: "L",
      priority: "high",
      status: "review",
      tags: ["bug"],
    });
    const edited = live();
    expect(edited.title).toBe("Renamed");
    expect(edited.body).toBe("A new body.");
    expect(edited.size).toBe("L");
    expect(edited.priority).toBe("high");
    expect(edited.status).toBe("review");
    expect(edited.tags).toEqual(["bug"]);
    expect(Date.parse(edited.updatedAt)).toBeGreaterThan(Date.parse(base.updatedAt));
    // The base ticket keeps its fields; only the merge changes.
    expect(base.title).toBe("A ticket");
    expect(base.tags).toEqual([]);
  });

  it("stamps closedAt on terminal statuses and clears it on the way out", () => {
    store.editTicket(base.id, { ...draft, status: "done" });
    const done = live();
    expect(done.closedAt).toBeDefined();

    // Staying terminal keeps the original stamp.
    store.editTicket(base.id, { ...draft, status: "done" }, { previousClosedAt: done.closedAt });
    expect(live().closedAt).toBe(done.closedAt);

    // Leaving terminal clears it.
    store.editTicket(base.id, { ...draft, status: "open" }, { previousClosedAt: done.closedAt });
    const reopened = live();
    expect(reopened.status).toBe("open");
    expect(reopened.closedAt).toBeUndefined();
  });

  it("claims an unassigned ticket only when the editor passes the assignee", () => {
    store.editTicket(base.id, { ...draft, status: "in_progress" }, { assignee: ada });
    expect(live().assignee).toEqual(ada);

    store.resetTicketsStore();
    store.editTicket(base.id, { ...draft, status: "in_progress" });
    expect(live().assignee).toBeUndefined();
  });

  it("appends session comments without touching the base ticket", () => {
    const entry = store.addTicketComment(base.id, {
      author: ada,
      body: "First look.",
      createdAt: "2026-09-20T00:00:00.000Z",
    });
    expect(live().comments).toEqual([entry]);
    expect(live().comments).toEqual([entry]);
    expect(base.comments).toEqual([]);
    expect(Date.parse(live().updatedAt)).toBe(Date.parse(entry.createdAt));
  });

  it("replaces the blocker list so fixture blockers can be removed", () => {
    const withBlocker: Ticket = { ...base, blockedBy: ["ticket-dos-0"] };
    store.setTicketBlockers(withBlocker.id, ["ticket-dos-2"]);
    expect(live(withBlocker).blockedBy).toEqual(["ticket-dos-2"]);
    store.setTicketBlockers(withBlocker.id, []);
    expect(live(withBlocker).blockedBy).toEqual([]);
  });

  it("unpins session and fixture links by id, fixtures included", () => {
    const linked: Ticket = {
      ...base,
      links: [
        {
          id: "l1",
          kind: "pr",
          url: "https://example.com/pr/1",
          label: "PR 1",
          addedBy: ada,
        },
      ],
    };
    const pinned = store.addTicketLink(linked.id, {
      kind: "commit",
      url: "https://example.com/c/2",
      label: "C 2",
      addedBy: ada,
    });
    expect(live(linked).links.map((entry) => entry.id)).toEqual(["l1", pinned.id]);

    store.removeTicketLink(linked.id, pinned.id);
    expect(live(linked).links.map((entry) => entry.id)).toEqual(["l1"]);

    store.removeTicketLink(linked.id, "l1");
    expect(live(linked).links).toEqual([]);
    // The base ticket keeps its links; only the merge changes.
    expect(linked.links.map((entry) => entry.id)).toEqual(["l1"]);
  });

  it("edits and tombstones comments by id, fixtures included", () => {
    const commented: Ticket = {
      ...base,
      comments: [
        { id: "c1", author: ada, body: "First look.", createdAt: "2026-09-01T00:00:00.000Z" },
      ],
    };
    store.editTicketComment(commented.id, "c1", "Second look.");
    const edited = live(commented).comments[0];
    expect(edited?.body).toBe("Second look.");
    expect(edited?.editedAt).toBeDefined();

    store.deleteTicketComment(commented.id, "c1");
    const deleted = live(commented).comments[0];
    expect(deleted?.deletedAt).toBeDefined();
    // The base ticket keeps the original text; only the merge changes.
    expect(commented.comments[0]?.body).toBe("First look.");
    // The store-only keys never leak into the merged ticket.
    const merged = live(commented);
    expect("commentEdits" in merged).toBe(false);
    expect("deletedComments" in merged).toBe(false);
  });
});
