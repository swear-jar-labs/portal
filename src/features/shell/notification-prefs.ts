"use client";

import { create } from "zustand";
import { z } from "zod";

// Which inbox kinds the user can mute in /settings: activity mail. Decisions
// (application/project/review) always arrive and have no toggle: the pin test
// next to this module keeps the toggles and the inbox kinds partitioned, so a
// new inbox kind forces a conscious classification instead of slipping through.
// Device-local preferences: stored in this browser until user_settings lands
// with auth (Phase 5). Keyed per user: the mock switches actors in one
// browser, and the delivery gate reads the recipient, not the session.

export const NOTIFICATION_PREFS_STORAGE_KEY = "swearjar.dos.notifications";

export const notificationToggleKinds = ["reply", "ticket", "mention", "readroom", "team"] as const;
export type NotificationToggleKind = (typeof notificationToggleKinds)[number];

export type NotificationPrefs = Record<NotificationToggleKind, boolean>;

export const defaultNotificationPrefs: NotificationPrefs = {
  reply: true,
  ticket: true,
  mention: true,
  readroom: true,
  team: true,
};

const prefsEntrySchema = z
  .object({
    reply: z.boolean(),
    ticket: z.boolean(),
    mention: z.boolean(),
    readroom: z.boolean(),
    team: z.boolean(),
  })
  .partial();

export type NotificationPrefsBoxes = Record<string, NotificationPrefs>;

const prefsBoxesSchema = z.record(z.string(), z.unknown());

export function parseNotificationPrefs(raw: string | null): NotificationPrefsBoxes {
  if (!raw) return {};
  try {
    const parsed = prefsBoxesSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return {};
    // One broken entry falls back to the defaults without wiping the others.
    return Object.fromEntries(
      Object.entries(parsed.data).map(([user, value]): [string, NotificationPrefs] => {
        const entry = prefsEntrySchema.safeParse(value);
        return [user, { ...defaultNotificationPrefs, ...(entry.success ? entry.data : {}) }];
      }),
    );
  } catch {
    return {};
  }
}

export function serializeNotificationPrefs(boxes: NotificationPrefsBoxes): string {
  return JSON.stringify(boxes);
}

/**
 * The delivery gate: a kind with no stored entry for the recipient — unknown
 * users and the always-on decision kinds, which have no toggle — is delivered.
 * The cast narrows the lookup after the membership check; untoggleable kinds
 * resolve through the same default instead of a second table.
 */
export function notificationKindAdmitted(
  boxes: NotificationPrefsBoxes,
  user: string,
  kind: string,
): boolean {
  const entry = boxes[user];
  if (entry === undefined) return true;
  return kind in entry ? entry[kind as NotificationToggleKind] : true;
}

type NotificationPrefsStore = {
  boxes: NotificationPrefsBoxes;
  hydrated: boolean;
  hydrate: () => void;
  setPrefs: (user: string, prefs: NotificationPrefs) => void;
};

export const useNotificationPrefs = create<NotificationPrefsStore>((set, get) => ({
  boxes: {},
  hydrated: false,
  hydrate: () => {
    if (get().hydrated || typeof window === "undefined") return;
    set({
      boxes: parseNotificationPrefs(window.localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY)),
      hydrated: true,
    });
  },
  setPrefs: (user, prefs) => {
    const boxes = { ...get().boxes, [user]: prefs };
    set({ boxes });
    if (typeof window === "undefined") return;
    window.localStorage.setItem(NOTIFICATION_PREFS_STORAGE_KEY, serializeNotificationPrefs(boxes));
  },
}));

/** Store-backed delivery gate for section producers: reads the recipient's box. */
export function isNotificationKindEnabled(user: string, kind: string): boolean {
  const state = useNotificationPrefs.getState();
  state.hydrate();
  return notificationKindAdmitted(state.boxes, user, kind);
}

/** Test seam: drop every box between cases. */
export function resetNotificationPrefsForTests(): void {
  useNotificationPrefs.setState({ boxes: {}, hydrated: false });
}
