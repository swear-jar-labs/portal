// The inbox model: typed mock notifications and the minimal event shape the
// section producers will feed in task 09. Availability is a mock fact carried
// on the notification itself: the seed knows when its target is gone (a
// revoked role, an archived project), so the detail can explain instead of
// landing on a broken screen. A backend resolves this live in Phase 5.

export const inboxKinds = [
  "reply",
  "review",
  "ticket",
  "application",
  "readroom",
  "team",
  "project",
] as const;
export type InboxKind = (typeof inboxKinds)[number];

export const inboxTargetKinds = ["ticket", "thread", "readroom", "application", "project"] as const;
export type InboxTargetKind = (typeof inboxTargetKinds)[number];

// The only target contract other features need to know: a label for the
// detail and an in-app path to the originating object. Rendering stays in the
// owning feature, so this type never pulls a page across the slice graph.
export type InboxTarget = {
  kind: InboxTargetKind;
  label: string;
  href: string;
};

export type InboxNotification = {
  id: string;
  kind: InboxKind;
  // The originating surface: a project name or a board label (FORUM, ERRATA).
  source: string;
  subject: string;
  body: string;
  // ISO timestamp; the feed sorts newest first.
  at: string;
  target: InboxTarget;
  available: boolean;
  unavailableReason?: string;
  read: boolean;
};

// The minimal event a section producer posts for task 09: who it is for, what
// happened, and where it leads. The store stamps it into a notification and
// drops repeats of the same stable id.
export type InboxEvent = {
  id: string;
  kind: InboxKind;
  source: string;
  subject: string;
  body: string;
  at: string;
  target: InboxTarget;
  available?: boolean;
  unavailableReason?: string;
};

export function inboxEventToNotification(event: InboxEvent): InboxNotification {
  return {
    id: event.id,
    kind: event.kind,
    source: event.source,
    subject: event.subject,
    body: event.body,
    at: event.at,
    target: event.target,
    available: event.available ?? true,
    unavailableReason: event.unavailableReason,
    read: false,
  };
}

export function isInboxUnread(entry: InboxNotification): boolean {
  return !entry.read;
}

export function unreadInboxCount(list: readonly InboxNotification[]): number {
  return list.filter(isInboxUnread).length;
}

export function sortInboxNewest(list: readonly InboxNotification[]): readonly InboxNotification[] {
  return [...list].sort((first, second) => second.at.localeCompare(first.at));
}

// The feed optionally narrows to unread mail. The counter and list read the
// same notification state, so they never disagree.
export function visibleInboxNotifications(
  list: readonly InboxNotification[],
  unreadOnly: boolean,
): readonly InboxNotification[] {
  const narrowed = unreadOnly ? list.filter(isInboxUnread) : list;
  return sortInboxNewest(narrowed);
}

// Stable DOM ids for the focus return: closing the detail lands back on the
// row that opened it, and the overlay machinery reuses the same id.
const INBOX_ROW_ID_PREFIX = "inbox-row-";
export const INBOX_FEED_ID = "inbox-feed";

export function inboxRowId(id: string): string {
  return `${INBOX_ROW_ID_PREFIX}${id}`;
}
