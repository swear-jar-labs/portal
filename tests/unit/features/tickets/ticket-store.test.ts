import { beforeEach, describe, expect, it, vi } from "vitest";
import * as store from "@/features/tickets/ticket-store";
import type { TicketComposeInput } from "@/features/tickets/schema";
import type { Ticket } from "@/features/tickets/tickets";

const ada = { user: "ada" };
const known: Ticket[] = [];

beforeEach(() => store.resetTicketsStore());

describe("ticket store", () => {
  it("composes sequential session tickets and keeps the server snapshot empty", () => {
    const input: TicketComposeInput = {
      project: "compiler",
      title: "A parser",
      body: "Build it.",
      size: "S",
      tags: ["good-first"],
    };
    expect(store.addTicket(input, ada, known).key).toBe("CMP-1");
    expect(store.addTicket(input, ada, store.ticketsSnapshot().addedTickets).key).toBe("CMP-2");
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
});
