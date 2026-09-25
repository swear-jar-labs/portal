import { inboxEventToNotification, type InboxEvent, type InboxNotification } from "./inbox";

// The mock mailbox: typed seeds per demo actor, stamped relative to the call
// so every phase of the demo reads as recent. The page passes its snapshot to
// the client stack once, so the server render and the hydrated list agree; the
// per-user store bucket keeps each actor's box apart afterwards. Real delivery
// from section actions lands in task 09; the shape it posts is InboxEvent.

type InboxSeed = Omit<InboxEvent, "at"> & { hoursAgo: number };
const HOUR_MS = 3_600_000;

function stamp(seed: InboxSeed, now: number): InboxNotification {
  const { hoursAgo, ...event } = seed;
  return inboxEventToNotification({
    ...event,
    at: new Date(now - hoursAgo * HOUR_MS).toISOString(),
  });
}

const adaSeeds: InboxSeed[] = [
  {
    id: "ada-review-tool-1",
    kind: "review",
    source: "TOOLING",
    subject: "Review requested on TOOL-1",
    body: "Ken asked for a review on TOOL-1. The diff is small and the tests are green.",
    target: { kind: "ticket", label: "TOOL-1", href: "/tickets/TOOL-1" },
    hoursAgo: 2,
  },
  {
    id: "ada-ticket-dos-3",
    kind: "ticket",
    source: "SWEARJAR.DOS",
    subject: "DOS-3 moved to REVIEW",
    body: "Lin moved DOS-3, a ticket you follow, from IN PROGRESS to REVIEW.",
    target: { kind: "ticket", label: "DOS-3", href: "/tickets/DOS-3" },
    hoursAgo: 5,
  },
  {
    id: "ada-readroom-bump",
    kind: "readroom",
    source: "READROOM",
    subject: "Report published: bump-allocator",
    body: "The write-up for bump-allocator is published. Notes and the report are open.",
    target: { kind: "readroom", label: "bump-allocator", href: "/readroom/bump-allocator" },
    hoursAgo: 9,
  },
  {
    id: "ada-team-tooling",
    kind: "team",
    source: "TOOLING",
    subject: "Weekly team digest",
    body: "Two tickets closed, one opened. Nothing needs your review right now.",
    target: { kind: "project", label: "tooling", href: "/projects/tooling" },
    hoursAgo: 26,
  },
  {
    id: "ada-archived-token-cache",
    kind: "project",
    source: "TOKEN-CACHE",
    subject: "token-cache was archived",
    body: "The project was archived while you followed it. Its tickets are read-only.",
    target: { kind: "project", label: "token-cache", href: "/projects/token-cache" },
    available: false,
    unavailableReason: "This project was archived, so its page is no longer available.",
    hoursAgo: 50,
  },
];

const memberSeeds: InboxSeed[] = [
  {
    id: "member-reply-forum",
    kind: "reply",
    source: "FORUM",
    subject: "Grace replied in read-first",
    body: "Grace answered your post in read-first. The thread moved since your visit.",
    target: { kind: "thread", label: "read-first", href: "/forum/read-first" },
    hoursAgo: 3,
  },
  {
    id: "member-readroom-notes",
    kind: "readroom",
    source: "READROOM",
    subject: "Notes opened: lookahead-table",
    body: "The deadline for lookahead-table passed. Every note is open now.",
    target: { kind: "readroom", label: "lookahead-table", href: "/readroom/lookahead-table" },
    hoursAgo: 20,
  },
  {
    id: "member-ticket-claimed",
    kind: "ticket",
    source: "COMPILER",
    subject: "CMP-1 was claimed",
    body: "Ken claimed CMP-1, a ticket you follow. It left the available queue.",
    target: { kind: "ticket", label: "CMP-1", href: "/tickets/CMP-1" },
    hoursAgo: 30,
  },
];

const participantSeeds: InboxSeed[] = [
  {
    id: "participant-reply-forum",
    kind: "reply",
    source: "FORUM",
    subject: "Ada replied in read-first",
    body: "Ada answered your post in read-first. The thread moved since your visit.",
    target: { kind: "thread", label: "read-first", href: "/forum/read-first" },
    hoursAgo: 4,
  },
  {
    id: "participant-readroom-notes",
    kind: "readroom",
    source: "READROOM",
    subject: "Notes opened: bump-allocator",
    body: "The deadline for bump-allocator passed. Every note is open now.",
    target: { kind: "readroom", label: "bump-allocator", href: "/readroom/bump-allocator" },
    hoursAgo: 22,
  },
  {
    id: "participant-application",
    kind: "application",
    source: "ACCOUNT",
    subject: "Your Member application is pending",
    body: "Admin has not decided yet. The history stays on your profile either way.",
    target: { kind: "application", label: "application", href: "/profile" },
    hoursAgo: 49,
  },
];

const adminSeeds: InboxSeed[] = [
  {
    id: "admin-maintainer-flagship",
    kind: "project",
    source: "FLAGSHIP",
    subject: "flagship lost its last Maintainer",
    body: "New assignments are paused until admin names a Maintainer for flagship.",
    target: { kind: "project", label: "flagship", href: "/admin" },
    hoursAgo: 1,
  },
  {
    id: "admin-application-queue",
    kind: "application",
    source: "ACCOUNT",
    subject: "Two applications wait in the queue",
    body: "New Member applications arrived. The admin queue lists them oldest first.",
    target: { kind: "application", label: "admin queue", href: "/admin" },
    hoursAgo: 7,
  },
  {
    id: "admin-ticket-dos-1",
    kind: "ticket",
    source: "SWEARJAR.DOS",
    subject: "DOS-1 is blocked",
    body: "DOS-1 picked up a blocker. The dossier lists the blocking ticket.",
    target: { kind: "ticket", label: "DOS-1", href: "/tickets/DOS-1" },
    hoursAgo: 12,
  },
];

const ADMIN_USERS = ["admin", "coadmin"] as const;
const MEMBER_SEED_USERS = ["grace", "ken", "lin"] as const;

function seedsFor(user: string): readonly InboxSeed[] {
  if (user === "ada") return adaSeeds;
  if (ADMIN_USERS.some((actor) => actor === user)) return adminSeeds;
  if (MEMBER_SEED_USERS.some((actor) => actor === user)) return memberSeeds;
  if (user === "demo-second") {
    return [
      {
        id: "demo-second-decision",
        kind: "application",
        source: "ACCOUNT",
        subject: "Admin asked for more detail",
        body: "Your Member application needs one clarification before it can be approved.",
        target: { kind: "application", label: "application", href: "/profile" },
        hoursAgo: 6,
      },
      ...participantSeeds,
    ];
  }
  return participantSeeds;
}

export async function listInboxSeed(user: string): Promise<readonly InboxNotification[]> {
  const now = Date.now();
  return seedsFor(user).map((seed) => stamp(seed, now));
}
