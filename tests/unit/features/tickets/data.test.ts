import { describe, expect, it } from "vitest";
import { projectSlugs } from "@/features/projects/contracts";
import { listReadroomsByTicket } from "@/features/readroom/contracts";
import { listReadrooms } from "@/features/readroom/data";
import { readroomPath } from "@/features/readroom/readrooms";
import { getTicketByKey, listTickets, listTicketsByProject } from "@/features/tickets/data";
import { isTicketKey, parseTicketKey, projectKeyPrefixes } from "@/features/tickets/tickets";

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

  it("covers every project and returns its latest updates first", async () => {
    for (const slug of projectSlugs) {
      const tickets = await listTicketsByProject(slug);
      expect(tickets.length, `${slug} has no ticket fixture`).toBeGreaterThan(0);
      expect(tickets.map((ticket) => Date.parse(ticket.updatedAt))).toEqual(
        [...tickets]
          .map((ticket) => Date.parse(ticket.updatedAt))
          .sort((left, right) => right - left),
      );
    }
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
});
