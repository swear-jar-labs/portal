/** Facts emitted by mock ticket actions. Task 09 consumes the same event
 * stream for inbox delivery; task 10 can scrub the actor and subject fields. */
export const ticketEventKinds = [
  "created",
  "claimed",
  "left",
  "edited",
  "status",
  "assigned",
  "reviewer",
  "commented",
  "comment-edited",
  "comment-deleted",
  "linked",
  "unlinked",
  "blockers",
] as const;
export type TicketEventKind = (typeof ticketEventKinds)[number];

export type TicketEvent = {
  id: string;
  ticketId: string;
  kind: TicketEventKind;
  actor: string;
  at: string;
  subject?: string;
};

let events: readonly TicketEvent[] = [];
const listeners = new Set<() => void>();

function newEventId(): string {
  // crypto.randomUUID needs a secure context; the mock also runs over plain
  // http previews, so fall back to a random id there.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  return `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function recordTicketEvent(event: Omit<TicketEvent, "id">): TicketEvent {
  const entry = { ...event, id: newEventId() };
  events = [...events, entry];
  for (const listener of listeners) listener();
  return entry;
}

export function ticketEventsSnapshot(): readonly TicketEvent[] {
  return events;
}

export function subscribeTicketEvents(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetTicketEvents(): void {
  events = [];
  for (const listener of listeners) listener();
}
