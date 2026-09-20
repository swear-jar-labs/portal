"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  filterTickets,
  sortTickets,
  type Ticket,
  type TicketPerson,
  type TicketQuery,
} from "./tickets";
import * as ticketStore from "./ticket-store";
import type { TicketComposeInput } from "./schema";

export type TicketSessionOptions = {
  tickets: readonly Ticket[];
  query: TicketQuery;
};

/** The UI-first tickets' data layer: the fixture tickets plus the session's
 * composed ones, filtered and sorted for the tracker. The island keeps
 * navigation and gating; Phase 5 replaces the store with server actions, the
 * components do not change. */
export function useTicketSession({ tickets, query }: TicketSessionOptions) {
  const state = useSyncExternalStore(
    ticketStore.subscribeTickets,
    ticketStore.ticketsSnapshot,
    ticketStore.ticketsServerSnapshot,
  );

  const all = useMemo(
    () => [
      ...state.addedTickets,
      ...tickets.map((ticket) => ticketStore.withSessionLinks(ticket, state)),
    ],
    [state, tickets],
  );

  const visible = useMemo(() => sortTickets(filterTickets(all, query)), [all, query]);

  const localKeys = useMemo(
    () => new Set(state.addedTickets.map((ticket) => ticket.key)),
    [state.addedTickets],
  );

  const addTicket = useCallback(
    (input: TicketComposeInput, author: TicketPerson): Ticket => {
      return ticketStore.addTicket(input, author, all);
    },
    [all],
  );

  return { state, visible, localKeys, addTicket };
}
