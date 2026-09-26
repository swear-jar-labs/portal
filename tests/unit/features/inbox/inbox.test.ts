import { describe, expect, it } from "vitest";
import {
  inboxEventToNotification,
  inboxRowId,
  isInboxUnread,
  sortInboxNewest,
  unreadInboxCount,
  visibleInboxNotifications,
  type InboxNotification,
} from "@/features/inbox/inbox";

function entry(overrides: Partial<InboxNotification> = {}): InboxNotification {
  return {
    id: "mail-1",
    kind: "reply",
    source: "FORUM",
    subject: "A reply",
    body: "Hello.",
    at: "2026-09-25T10:00:00.000Z",
    target: { kind: "thread", label: "read-first", href: "/forum/read-first" },
    available: true,
    read: false,
    ...overrides,
  };
}

describe("inbox model", () => {
  it("stamps an event into an unread notification", () => {
    const notification = inboxEventToNotification({
      id: "event-1",
      kind: "ticket",
      source: "TOOLING",
      subject: "Moved",
      body: "Moved to review.",
      at: "2026-09-25T10:00:00.000Z",
      target: { kind: "ticket", label: "TOOL-1", href: "/tickets/TOOL-1" },
    });
    expect(notification.read).toBe(false);
    expect(notification.available).toBe(true);
    expect(notification.unavailableReason).toBeUndefined();
  });

  it("keeps an explicitly unavailable target from the event", () => {
    const notification = inboxEventToNotification({
      id: "event-2",
      kind: "project",
      source: "TOKEN-CACHE",
      subject: "Archived",
      body: "Gone.",
      at: "2026-09-25T10:00:00.000Z",
      target: { kind: "project", label: "token-cache", href: "/projects/token-cache" },
      available: false,
      unavailableReason: "Archived.",
    });
    expect(notification.available).toBe(false);
    expect(notification.unavailableReason).toBe("Archived.");
  });

  it("counts unread messages", () => {
    const list = [entry({ id: "a" }), entry({ id: "b", read: true })] as const;
    expect(unreadInboxCount(list)).toBe(1);
    expect(isInboxUnread(list[0])).toBe(true);
    expect(isInboxUnread(list[1])).toBe(false);
  });

  it("sorts newest first", () => {
    const list = [
      entry({ id: "old", at: "2026-09-24T10:00:00.000Z" }),
      entry({ id: "new", at: "2026-09-25T10:00:00.000Z" }),
    ];
    expect(sortInboxNewest(list).map((item) => item.id)).toEqual(["new", "old"]);
  });

  it("projects the list with the unread filter", () => {
    const list = [
      entry({ id: "fresh", at: "2026-09-25T10:00:00.000Z" }),
      entry({ id: "seen", at: "2026-09-25T09:00:00.000Z", read: true }),
    ];
    expect(visibleInboxNotifications(list, false).map((item) => item.id)).toEqual([
      "fresh",
      "seen",
    ]);
    expect(visibleInboxNotifications(list, true).map((item) => item.id)).toEqual(["fresh"]);
  });

  it("names stable row ids for the focus return", () => {
    expect(inboxRowId("ada-review-tool-1")).toBe("inbox-row-ada-review-tool-1");
  });
});
