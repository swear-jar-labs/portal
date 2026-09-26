"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  inboxEventToNotification,
  unreadInboxCount,
  type InboxEvent,
  type InboxNotification,
} from "./inbox";

// The session mailbox: one bucket per recipient, seeded once from the page's
// server snapshot. Switching demo actors never wipes or leaks another box —
// LOGOFF drops the cookie only, the buckets live as long as the SPA — and a
// reload drops every bucket back to its seed. Phase 5 replaces the bucket
// writes with server actions; the read/delete/dedup semantics stay.

type InboxBuckets = Readonly<Record<string, readonly InboxNotification[]>>;

let buckets: InboxBuckets = {};
const seededRecipients = new Set<string>();
const deletedIdsByRecipient = new Map<string, Set<string>>();
const listeners = new Set<() => void>();

function setBuckets(next: InboxBuckets): void {
  buckets = next;
  for (const listener of listeners) listener();
}

function updateBucket(
  user: string,
  patch: (list: readonly InboxNotification[]) => readonly InboxNotification[],
): void {
  setBuckets({ ...buckets, [user]: patch(buckets[user] ?? []) });
}

/** Seed the recipient's bucket once; later calls keep the live box. */
export function ensureInbox(user: string, seed: readonly InboxNotification[]): void {
  if (seededRecipients.has(user)) return;
  seededRecipients.add(user);
  const live = buckets[user] ?? [];
  const liveIds = new Set(live.map((entry) => entry.id));
  const deletedIds = deletedIdsByRecipient.get(user);
  setBuckets({
    ...buckets,
    [user]: [
      ...live,
      ...seed.filter((entry) => !liveIds.has(entry.id) && !deletedIds?.has(entry.id)),
    ],
  });
}

/** Post a section event into the recipient's box; a repeated stable id is dropped. */
export function enqueueInboxEvent(user: string, event: InboxEvent): void {
  updateBucket(user, (list) => {
    if (
      deletedIdsByRecipient.get(user)?.has(event.id) ||
      list.some((entry) => entry.id === event.id)
    )
      return list;
    return [inboxEventToNotification(event), ...list];
  });
}

export function markInboxRead(user: string, id: string): void {
  updateBucket(user, (list) =>
    list.map((entry) => (entry.id === id ? { ...entry, read: true } : entry)),
  );
}

export function setInboxSelectedRead(user: string, ids: readonly string[], read: boolean): void {
  const selected = new Set(ids);
  updateBucket(user, (list) =>
    list.map((entry) => (selected.has(entry.id) ? { ...entry, read } : entry)),
  );
}

export function deleteInboxSelected(user: string, ids: readonly string[]): void {
  const selected = new Set(ids);
  const deleted = deletedIdsByRecipient.get(user) ?? new Set<string>();
  for (const id of selected) deleted.add(id);
  deletedIdsByRecipient.set(user, deleted);
  updateBucket(user, (list) => list.filter((entry) => !selected.has(entry.id)));
}

export function subscribeInboxStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function inboxStoreSnapshot(): InboxBuckets {
  return buckets;
}

/** Test seam: drop every bucket between cases. */
export function resetInboxForTests(): void {
  seededRecipients.clear();
  deletedIdsByRecipient.clear();
  setBuckets({});
}

export type InboxSession = {
  list: readonly InboxNotification[];
  unread: number;
};

/**
 * The recipient's live box: the page's server seed until the first bucket
 * write, the bucket afterwards. The header counter and the list read this
 * same selection, so they never disagree.
 */
export function useInboxSession(user: string, seed: readonly InboxNotification[]): InboxSession {
  useEffect(() => {
    ensureInbox(user, seed);
  }, [user, seed]);
  // The snapshot stays a stable bucket reference: deriving the counter with
  // useMemo keeps getSnapshot cached, as useSyncExternalStore requires.
  const list = useSyncExternalStore(
    subscribeInboxStore,
    () => inboxStoreSnapshot()[user] ?? seed,
    () => seed,
  );
  const unread = useMemo(() => unreadInboxCount(list), [list]);
  return { list, unread };
}
