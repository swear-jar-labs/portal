// The tickets' contract: the only surface other features import. It is a
// manifest, not an implementation: explicit re-exports of the slice's
// internals, nothing else. Only leaves without cross-feature imports live
// here — pages that read other contracts (TicketPanel, ProjectTicketsSection)
// stay out, or the barrel would loop the slice graph (see AGENTS.md). The
// contract test pins the published list.

export { ticketPath } from "../model/tickets";
export { listTickets, listTicketsByProject } from "../data/queries";
export { useMergedTickets } from "../data/useTicketSession";
export { countDoneBySize } from "../model/claim";
export type { TrackRecord } from "../model/claim";
export { TicketsOverlayTable } from "../list/TicketsOverlayTable";
export type { Ticket } from "../model/tickets";
export { subscribeTicketEvents, ticketEventsSnapshot } from "../data/ticket-events";
export type { TicketEvent, TicketEventKind } from "../data/ticket-events";
