import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteInboxSelected,
  enqueueInboxEvent,
  ensureInbox,
  inboxStoreSnapshot,
  markInboxRead,
  setInboxSelectedRead,
  resetInboxForTests,
} from "@/features/inbox/inbox-store";
import type { InboxEvent, InboxNotification } from "@/features/inbox/inbox";

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

function event(overrides: Partial<InboxEvent> = {}): InboxEvent {
  return {
    id: "event-1",
    kind: "ticket",
    source: "TOOLING",
    subject: "Moved",
    body: "Moved to review.",
    at: "2026-09-25T10:00:00.000Z",
    target: { kind: "ticket", label: "TOOL-1", href: "/tickets/TOOL-1" },
    ...overrides,
  };
}

beforeEach(() => resetInboxForTests());

describe("inbox store", () => {
  it("seeds a recipient once and keeps the live box afterwards", () => {
    ensureInbox("ada", [entry({ id: "seed-1" })]);
    ensureInbox("ada", [entry({ id: "seed-2" })]);
    expect(inboxStoreSnapshot()["ada"]?.map((item) => item.id)).toEqual(["seed-1"]);
  });

  it("keeps events posted before the first seed alongside the seed", () => {
    enqueueInboxEvent("ada", event({ id: "live-1" }));
    ensureInbox("ada", [entry({ id: "seed-1" })]);
    ensureInbox("ada", [entry({ id: "seed-2" })]);
    expect(inboxStoreSnapshot()["ada"]?.map((item) => item.id)).toEqual(["live-1", "seed-1"]);
  });

  it("keeps recipients apart without leaking or wiping", () => {
    ensureInbox("ada", [entry({ id: "ada-1" })]);
    ensureInbox("grace", [entry({ id: "grace-1" }), entry({ id: "grace-2" })]);
    markInboxRead("grace", "grace-1");
    expect(inboxStoreSnapshot()["ada"]?.map((item) => item.id)).toEqual(["ada-1"]);
    expect(inboxStoreSnapshot()["ada"]?.[0]?.read).toBe(false);
    expect(inboxStoreSnapshot()["grace"]?.find((item) => item.id === "grace-1")?.read).toBe(true);
  });

  it("marks selected messages read and unread without changing unselected messages", () => {
    ensureInbox("ada", [entry({ id: "a" }), entry({ id: "b" }), entry({ id: "c" })]);
    markInboxRead("ada", "a");
    expect(inboxStoreSnapshot()["ada"]?.find((item) => item.id === "a")?.read).toBe(true);
    setInboxSelectedRead("ada", ["b", "c"], true);
    expect(inboxStoreSnapshot()["ada"]?.map((item) => item.read)).toEqual([true, true, true]);
    setInboxSelectedRead("ada", ["a", "c"], false);
    expect(inboxStoreSnapshot()["ada"]?.map((item) => item.read)).toEqual([false, true, false]);
  });

  it("deletes only selected messages for the addressed recipient", () => {
    ensureInbox("ada", [entry({ id: "a" }), entry({ id: "b" }), entry({ id: "c" })]);
    ensureInbox("grace", [entry({ id: "a" })]);
    deleteInboxSelected("ada", ["a", "c"]);
    expect(inboxStoreSnapshot()["ada"]?.map((item) => item.id)).toEqual(["b"]);
    expect(inboxStoreSnapshot()["grace"]?.map((item) => item.id)).toEqual(["a"]);
  });

  it("does not resurrect a deleted event when it is delivered or seeded again", () => {
    enqueueInboxEvent("ada", event({ id: "same-event" }));
    deleteInboxSelected("ada", ["same-event"]);
    enqueueInboxEvent("ada", event({ id: "same-event" }));
    ensureInbox("ada", [entry({ id: "same-event" }), entry({ id: "other" })]);
    expect(inboxStoreSnapshot()["ada"]?.map((item) => item.id)).toEqual(["other"]);
  });

  it("enqueues section events and drops repeats of the same stable id", () => {
    enqueueInboxEvent("ada", event({ id: "stable-1" }));
    enqueueInboxEvent("ada", event({ id: "stable-1" }));
    enqueueInboxEvent("ada", event({ id: "stable-2" }));
    expect(inboxStoreSnapshot()["ada"]?.map((item) => item.id)).toEqual(["stable-2", "stable-1"]);
  });
});
