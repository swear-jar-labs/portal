import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CLAIM_POLICY } from "@/features/projects/contracts";
import * as store from "@/features/tickets/ticket-store";
import { ticketEventsSnapshot } from "@/features/tickets/ticket-events";
import {
  activeTicketFor,
  canChangeTicketStatus,
  canEditTicket,
  canManageTicketBlockers,
  canWriteTicket,
  claimBlock,
  INACTIVITY_MS,
  needsMaintainerCheckIn,
  nextReviewer,
  reviewerCandidates,
  type TicketProject,
} from "@/features/tickets/workflow";
import type { Ticket } from "@/features/tickets/tickets";

const ada = { user: "ada", level: "member", admin: false } as const;
const grace = { user: "grace", level: "member", admin: false } as const;
const ken = { user: "ken", level: "member", admin: false } as const;
const participant = { user: "newcomer", level: "participant", admin: false } as const;
const project: TicketProject = {
  slug: "swearjar-dos",
  status: "active",
  lead: { user: "ada" },
  maintainers: [{ user: "ada" }],
  reviewers: [{ user: "grace" }],
  claimPolicy: DEFAULT_CLAIM_POLICY,
};

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "ticket-one",
    key: "DOS-1",
    project: "swearjar-dos",
    title: "Work",
    body: "Investigate",
    status: "open",
    size: "S",
    priority: "normal",
    tags: [],
    author: { user: "grace" },
    links: [],
    comments: [],
    blockedBy: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ticket workflow", () => {
  beforeEach(() => store.resetTicketsStore());

  it("keeps project powers separate from community level and team subscription", () => {
    const work = ticket();
    expect(canWriteTicket(participant, project)).toBe(false);
    expect(canEditTicket(participant, work, project)).toBe(false);
    expect(canWriteTicket(ken, project)).toBe(true);
    expect(canEditTicket(ken, work, project)).toBe(false);
    expect(canEditTicket(ada, work, project)).toBe(true);
    expect(canEditTicket(grace, work, project)).toBe(true);
    expect(canEditTicket(ada, work, { ...project, status: "archived" })).toBe(false);
    expect(canManageTicketBlockers(ada, project)).toBe(true);
    expect(canManageTicketBlockers(grace, project)).toBe(false);
    expect(canManageTicketBlockers(ken, project)).toBe(false);
    expect(canManageTicketBlockers(ada, { ...project, maintainers: [] })).toBe(false);
    expect(canManageTicketBlockers(ada, { ...project, status: "archived" })).toBe(false);
  });

  it("lets an assignee move active work but not reopen completed work", () => {
    const assigned = ticket({ assignee: { user: "ken" } });
    expect(canChangeTicketStatus(ken, assigned, "review")).toBe(true);
    expect(canChangeTicketStatus(ken, assigned, "done")).toBe(false);
    expect(canChangeTicketStatus(grace, assigned, "review")).toBe(false);
    expect(canChangeTicketStatus(ken, { ...assigned, status: "done" }, "review")).toBe(false);
    expect(canChangeTicketStatus(ken, { ...assigned, status: "closed" }, "in_progress")).toBe(
      false,
    );
  });

  it("combines claim requirements and rejects a second active task", () => {
    const open = ticket();
    const active = ticket({
      id: "ticket-two",
      key: "DOS-2",
      assignee: { user: "ken" },
      status: "review",
    });
    expect(claimBlock(participant, open, [open], project)).toBe("member");
    expect(claimBlock(ken, open, [open], project)).toBeNull();
    expect(claimBlock(ken, open, [open, active], project)).toBe("active");
    expect(activeTicketFor([active], "ken")?.key).toBe("DOS-2");
    expect(claimBlock(ken, open, [open], { ...project, maintainers: [] })).toBe("paused");
    expect(claimBlock(ken, open, [open], { ...project, status: "archived" })).toBe("archived");
    expect(claimBlock(ken, ticket({ size: "M" }), [open], project)).toBe("ladder");
    expect(claimBlock(ken, ticket({ blockedBy: [active.id] }), [open, active], project)).toBe(
      "blocked",
    );
  });

  it("commits claims against the latest store snapshot", () => {
    const first = ticket();
    const second = ticket({ id: "ticket-two", key: "DOS-2" });
    const base = [first, second];
    expect(store.tryClaimTicket(first.id, ken, project, base)).toBeNull();
    expect(store.tryClaimTicket(second.id, ken, project, base)).toBe("active");
    expect(
      store.mergedTickets(base, store.ticketsSnapshot()).map((entry) => entry.assignee?.user),
    ).toEqual(["ken", undefined]);
    expect(ticketEventsSnapshot().map((event) => event.kind)).toEqual(["claimed", "reviewer"]);
    expect(ticketEventsSnapshot()[0]).toMatchObject({ ticketId: first.id, actor: "ken" });
  });

  it("offers only project reviewers and maintainers, excluding the assignee", () => {
    expect(reviewerCandidates(project, "ada")).toEqual(["grace"]);
    expect(reviewerCandidates(project, "ken")).toEqual(["ada", "grace"]);
    expect(nextReviewer(project, "ken")).toBe("ada");
    expect(nextReviewer(project, "ken", "ada")).toBe("grace");
    expect(nextReviewer(project, "ada", "ada")).toBe("grace");
    expect(nextReviewer({ ...project, reviewers: [] }, "ada")).toBeNull();
  });

  it("assigns one reviewer on claim and rotates across tickets in a session", () => {
    const first = ticket();
    const second = ticket({ id: "ticket-two", key: "DOS-2" });
    const third = ticket({ id: "ticket-three", key: "DOS-3" });
    const base = [first, second, third];
    for (const [work, expected] of [
      [first, "ada"],
      [second, "grace"],
      [third, "ada"],
    ] as const) {
      expect(store.tryClaimTicket(work.id, ken, project, base)).toBeNull();
      expect(store.withSessionState(work, store.ticketsSnapshot()).reviewer?.user).toBe(expected);
      store.leaveTicket(work.id, ken.user);
      expect(store.withSessionState(work, store.ticketsSnapshot()).reviewer).toBeUndefined();
    }
    expect(ticketEventsSnapshot().filter((event) => event.kind === "reviewer")).toMatchObject([
      { subject: "ada" },
      { subject: "grace" },
      { subject: "ada" },
    ]);
  });

  it("allows claim when no eligible reviewer remains", () => {
    const work = ticket();
    const solo = { ...project, reviewers: [] };
    expect(store.tryClaimTicket(work.id, ada, solo, [work])).toBeNull();
    expect(store.withSessionState(work, store.ticketsSnapshot()).reviewer).toBeUndefined();
  });

  it("signals after three days without moving the ticket or its assignee", () => {
    const start = "2026-09-01T00:00:00.000Z";
    const work = ticket({
      assignee: { user: "ken" },
      status: "in_progress",
      lastActivityAt: start,
    });
    const justBefore = new Date(Date.parse(start) + INACTIVITY_MS - 1).toISOString();
    const due = new Date(Date.parse(start) + INACTIVITY_MS).toISOString();
    expect(needsMaintainerCheckIn(work, justBefore)).toBe(false);
    expect(needsMaintainerCheckIn(work, due)).toBe(true);
    expect(needsMaintainerCheckIn({ ...work, status: "done" }, due)).toBe(false);
    expect(work.assignee?.user).toBe("ken");
    expect(work.status).toBe("in_progress");
    store.addTicketComment(
      work.id,
      { author: { user: "visitor" }, body: "Watching this", createdAt: due },
      false,
    );
    expect(needsMaintainerCheckIn(store.withSessionState(work, store.ticketsSnapshot()), due)).toBe(
      true,
    );
    store.addTicketComment(
      work.id,
      {
        author: { user: "ken" },
        body: "Found the timer drift",
        createdAt: due,
      },
      true,
    );
    const progressed = store.withSessionState(work, store.ticketsSnapshot());
    expect(needsMaintainerCheckIn(progressed, due)).toBe(false);
    expect(ticketEventsSnapshot().map((event) => event.kind)).toEqual(["commented", "commented"]);
  });
});
