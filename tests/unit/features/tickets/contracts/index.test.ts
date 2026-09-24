import { describe, expect, it } from "vitest";
import * as ticketsContract from "@/features/tickets/contracts";

describe("tickets contract", () => {
  it("publishes exactly the agreed surface", () => {
    expect(Object.keys(ticketsContract).sort()).toEqual([
      "TicketsOverlayTable",
      "listTickets",
      "listTicketsByProject",
      "ticketPath",
      "useMergedTickets",
    ]);
  });
});
