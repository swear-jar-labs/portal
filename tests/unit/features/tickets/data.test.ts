import { describe, expect, it } from "vitest";
import { projectSlugs } from "@/features/projects/contracts";
import { listReadroomsByTicket } from "@/features/readroom/contracts";
import { listReadrooms } from "@/features/readroom/data";
import { readroomPath } from "@/features/readroom/readrooms";
import { getTicketByKey, listTickets, listTicketsByProject } from "@/features/tickets/data";
import {
  blockEdges,
  isTicketKey,
  isTicketPriority,
  parseTicketKey,
  projectKeyPrefixes,
  wouldCycle,
} from "@/features/tickets/tickets";

describe("tickets fixtures", () => {
  it("keeps keys unique, resolvable and paired with their project prefix", async () => {
    const tickets = await listTickets();
    expect(tickets).toHaveLength(20);
    expect(new Set(tickets.map((ticket) => ticket.key)).size).toBe(tickets.length);
    for (const ticket of tickets) {
      expect(isTicketKey(ticket.key), ticket.key).toBe(true);
      expect(parseTicketKey(ticket.key)?.prefix).toBe(projectKeyPrefixes[ticket.project]);
      expect(await getTicketByKey(ticket.key)).toBe(ticket);
    }
    expect(await getTicketByKey("NOPE-1")).toBeNull();
  });

  it("covers every project and orders by priority, then the freshest update", async () => {
    const rank = { high: 0, normal: 1, low: 2 } as const;
    for (const slug of projectSlugs) {
      const tickets = await listTicketsByProject(slug);
      expect(tickets.length, `${slug} has no ticket fixture`).toBeGreaterThan(0);
      const ranks = tickets.map((ticket) => rank[ticket.priority]);
      expect(ranks, slug).toEqual([...ranks].sort((left, right) => left - right));
      for (const [index, ticket] of tickets.entries()) {
        expect(isTicketPriority(ticket.priority), ticket.key).toBe(true);
        const next = tickets[index + 1];
        if (next !== undefined && next.priority === ticket.priority) {
          expect(
            Date.parse(next.updatedAt),
            `${ticket.key} before ${next.key}`,
          ).toBeLessThanOrEqual(Date.parse(ticket.updatedAt));
        }
      }
    }
  });

  it("keeps demo priorities on both ends of the scale", async () => {
    const tickets = await listTickets();
    expect(tickets.filter((ticket) => ticket.priority === "high")).toHaveLength(2);
    expect(tickets.filter((ticket) => ticket.priority === "low")).toHaveLength(2);
  });

  it("keeps code links valid and the reverse readroom list in sync", async () => {
    const tickets = await listTickets();
    for (const ticket of tickets) {
      for (const link of ticket.links) expect(() => new URL(link.url)).not.toThrow();
    }
    // The dossier's reverse list is exactly the readrooms whose ticket matches.
    const readrooms = await listReadrooms();
    for (const ticket of tickets) {
      const expected = readrooms
        .filter((readroom) => readroom.ticket === ticket.key)
        .map((readroom) => ({
          id: readroom.id,
          title: readroom.title,
          path: readroomPath(readroom.id),
        }));
      expect(await listReadroomsByTicket(ticket.key)).toEqual(expected);
    }
    expect(await listReadroomsByTicket("DOS-3")).toHaveLength(1);
  });

  it("keeps blocker ids resolvable, self-free and acyclic", async () => {
    const tickets = await listTickets();
    const ids = new Set(tickets.map((ticket) => ticket.id));
    for (const ticket of tickets) {
      for (const blockerId of ticket.blockedBy) {
        expect(ids.has(blockerId), `${ticket.key} blocked by an unknown ${blockerId}`).toBe(true);
        expect(blockerId).not.toBe(ticket.id);
      }
    }
    for (const edge of blockEdges(tickets)) {
      expect(wouldCycle(edge.blockerId, edge.blockedId, tickets), edge.blockedId).toBe(false);
    }
    // The demo keeps a live block, a cross-project one and a finished blocker.
    expect(tickets.filter((ticket) => ticket.blockedBy.length > 0)).toHaveLength(3);
  });
});
