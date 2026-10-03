export { TicketsPage, ticketsMetadata, type TicketsPageProps } from "./list/TicketsPage";
export { TicketPage, generateTicketMetadata, type TicketPageProps } from "./detail/TicketPage";
export { InterceptedTicketPage, loadTicketLayer } from "./detail/TicketOverlay";
// The shell's jar dialog counts the tracker's bugs through the layout: the
// app layer reads the facade, never the slice's internals.
export { listTickets } from "./data/queries";
export { BugJarRow } from "./jar/BugJarRow";
