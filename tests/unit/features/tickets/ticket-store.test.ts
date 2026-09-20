import { beforeEach, describe, expect, it, vi } from "vitest";
import * as store from "@/features/tickets/ticket-store";
import type { TicketComposeInput } from "@/features/tickets/schema";
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

  it("starts a ticket for the member who pressed START", () => {
    store.startTicket(base.id, ada);
    const started = live();
    expect(started.status).toBe("in_progress");
    expect(started.assignee).toEqual(ada);
    expect(Date.parse(started.updatedAt)).toBeGreaterThan(Date.parse(base.updatedAt));
  });

  it("walks review, done and closed with a closedAt stamp", () => {
    store.sendTicketToReview(base.id);
    expect(live().status).toBe("review");
    store.finishTicket(base.id);
    const done = live();
    expect(done.status).toBe("done");
    expect(done.closedAt).toBeDefined();

    store.resetTicketsStore();
    store.closeTicket(base.id);
    const closed = live();
    expect(closed.status).toBe("closed");
    expect(closed.closedAt).toBeDefined();
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
