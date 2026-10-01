import { beforeEach, describe, expect, it } from "vitest";
import { inboxKinds } from "@/features/inbox/inbox";
import {
  defaultNotificationPrefs,
  isNotificationKindEnabled,
  notificationKindAdmitted,
  notificationToggleKinds,
  parseNotificationPrefs,
  resetNotificationPrefsForTests,
  serializeNotificationPrefs,
  useNotificationPrefs,
} from "@/features/shell/notification-prefs";

// The classification from tasks/notifications-settings.active.md: toggles are
// activity mail, decisions always arrive without a toggle.
const alwaysOnKinds = ["application", "project", "review"] as const;

describe("notification kinds classification", () => {
  it("partitions the inbox kinds into toggles and always-on decisions", () => {
    expect([...notificationToggleKinds, ...alwaysOnKinds].sort()).toEqual([...inboxKinds].sort());
    for (const kind of notificationToggleKinds) {
      expect(alwaysOnKinds).not.toContain(kind);
    }
  });
});

describe("parseNotificationPrefs", () => {
  it("returns no boxes for missing or broken storage", () => {
    expect(parseNotificationPrefs(null)).toEqual({});
    expect(parseNotificationPrefs("{")).toEqual({});
    expect(parseNotificationPrefs("[]")).toEqual({});
  });

  it("merges a partial entry over the defaults", () => {
    expect(parseNotificationPrefs('{"grace":{"mention":false}}')).toEqual({
      grace: { ...defaultNotificationPrefs, mention: false },
    });
  });

  it("keeps the other users when one entry is broken", () => {
    expect(parseNotificationPrefs('{"grace":{"mention":"yes"},"ken":{"team":false}}')).toEqual({
      grace: { ...defaultNotificationPrefs },
      ken: { ...defaultNotificationPrefs, team: false },
    });
  });
});

describe("serializeNotificationPrefs", () => {
  it("round-trips through the parser", () => {
    const boxes = { grace: { ...defaultNotificationPrefs, reply: false } };
    expect(parseNotificationPrefs(serializeNotificationPrefs(boxes))).toEqual(boxes);
  });
});

describe("notificationKindAdmitted", () => {
  it("delivers unknown users and untoggleable kinds", () => {
    expect(notificationKindAdmitted({}, "grace", "mention")).toBe(true);
    expect(
      notificationKindAdmitted({ grace: { ...defaultNotificationPrefs } }, "grace", "application"),
    ).toBe(true);
  });

  it("honours the recipient's toggle, not anyone else's", () => {
    const boxes = { grace: { ...defaultNotificationPrefs, mention: false } };
    expect(notificationKindAdmitted(boxes, "grace", "mention")).toBe(false);
    expect(notificationKindAdmitted(boxes, "ken", "mention")).toBe(true);
    expect(notificationKindAdmitted(boxes, "grace", "ticket")).toBe(true);
  });
});

describe("isNotificationKindEnabled", () => {
  beforeEach(() => resetNotificationPrefsForTests());

  it("reads the recipient's stored toggle", () => {
    useNotificationPrefs.getState().setPrefs("grace", { ...defaultNotificationPrefs, team: false });
    expect(isNotificationKindEnabled("grace", "team")).toBe(false);
    expect(isNotificationKindEnabled("grace", "reply")).toBe(true);
    expect(isNotificationKindEnabled("ken", "team")).toBe(true);
  });
});
