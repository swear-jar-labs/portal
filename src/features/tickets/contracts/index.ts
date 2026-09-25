// The tickets' contract: the only surface other features import. It is a
// manifest, not an implementation: explicit re-exports of the slice's
// internals, nothing else. Only leaves without cross-feature imports live
// here — pages that read other contracts (TicketPanel, ProjectTicketsSection)
// stay out, or the barrel would loop the slice graph (see AGENTS.md). The
// contract test pins the published list.

export { ticketPath } from "../tickets";
export { listTickets, listTicketsByProject } from "../data";
export { useMergedTickets } from "../useTicketSession";
export { TicketsOverlayTable } from "../TicketsOverlayTable";
export type { Ticket } from "../tickets";
export { subscribeTicketEvents, ticketEventsSnapshot } from "../ticket-events";
export type { TicketEvent, TicketEventKind } from "../ticket-events";
