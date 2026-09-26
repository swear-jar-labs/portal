import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CLAIM_POLICY } from "@/features/projects/contracts";
import { submitTicketEdit } from "@/features/tickets/data/edit-submit";
import { freshTicketAccess } from "@/features/tickets/data/mock-ticket-access";
import * as store from "@/features/tickets/data/ticket-store";
import type { Ticket } from "@/features/tickets/model/tickets";

const ken = { user: "ken", level: "member", admin: false } as const;
const project = {
  slug: "swearjar-dos",
  status: "active",
  lead: { user: "ada" },
  maintainers: [{ user: "ada" }],
  reviewers: [],
  claimPolicy: DEFAULT_CLAIM_POLICY,
} as const;

vi.mock("@/features/tickets/data/mock-ticket-access", () => ({
  freshTicketAccess: vi.fn(async () => ({ actor: ken, project })),
  isCurrentMember: vi.fn(async () => true),
}));

function ticket(): Ticket {
  return {
    id: "ticket-one",
    key: "DOS-1",
    project: project.slug,
    title: "Work",
    body: "Investigate",
    status: "open",
    size: "S",
    priority: "normal",
    tags: [],
    author: { user: "ada" },
    assignee: { user: "ken" },
    links: [],
    comments: [],
    blockedBy: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

describe("checked ticket edit", () => {
  beforeEach(() => store.resetTicketsStore());

  it("rejects an old assignee after reassignment while the form was open", async () => {
    const stale = ticket();
    const input = {
      title: stale.title,
      body: stale.body,
      size: stale.size,
      priority: stale.priority,
      status: "review" as const,
      tags: [...stale.tags],
    };
    store.editTicket(stale.id, { ...input, status: "open" }, { assignee: { user: "grace" } });
    expect(
      await submitTicketEdit(stale, [stale], input, { assignee: undefined, reviewer: undefined }),
    ).toBe("denied");
    expect(store.withSessionState(stale, store.ticketsSnapshot()).status).toBe("open");
  });

  it("rejects reopening work completed after the form was opened", async () => {
    const stale = ticket();
    const input = {
      title: stale.title,
      body: stale.body,
      size: stale.size,
      priority: stale.priority,
      status: "review" as const,
      tags: [...stale.tags],
    };
    store.editTicket(stale.id, { ...input, status: "done" });
    expect(
      await submitTicketEdit(stale, [stale], input, { assignee: undefined, reviewer: undefined }),
    ).toBe("status");
    expect(store.withSessionState(stale, store.ticketsSnapshot()).status).toBe("done");
  });

  it("preserves the one-active-task rule when a manager reopens completed work", async () => {
    vi.mocked(freshTicketAccess).mockResolvedValueOnce({
      actor: { user: "ada", level: "member", admin: false },
      project,
    });
    const completed = { ...ticket(), status: "done" as const };
    const active = { ...ticket(), id: "ticket-two", key: "DOS-2" };
    const input = {
      title: completed.title,
      body: completed.body,
      size: completed.size,
      priority: completed.priority,
      status: "review" as const,
      tags: [...completed.tags],
    };
    expect(
      await submitTicketEdit(completed, [completed, active], input, {
        assignee: undefined,
        reviewer: undefined,
      }),
    ).toBe("active");
    expect(store.withSessionState(completed, store.ticketsSnapshot()).status).toBe("done");
  });
});
