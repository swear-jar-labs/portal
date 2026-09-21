import { describe, expect, it } from "vitest";
import { DEFAULT_CLAIM_POLICY } from "@/features/projects/contracts";
import {
  canClaim,
  claimRefusal,
  countDoneBySize,
  EMPTY_TRACK_RECORD,
} from "@/features/tickets/claim";
import type { Ticket } from "@/features/tickets/tickets";
import { listTickets } from "@/features/tickets/data";

const ada = { user: "ada" };
const ken = { user: "ken" };

function ticket(overrides: Partial<Ticket> & Pick<Ticket, "key" | "project">): Ticket {
  return {
    id: overrides.key,
    title: overrides.key,
    body: "Work by hand.",
    status: "open",
    size: "S",
    priority: "normal",
    tags: [],
    author: ada,
    links: [],
    comments: [],
    blockedBy: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("claim ladder", () => {
  it("leaves S free for an empty record", () => {
    expect(canClaim(DEFAULT_CLAIM_POLICY, EMPTY_TRACK_RECORD, "S")).toBe(true);
    expect(claimRefusal(DEFAULT_CLAIM_POLICY, EMPTY_TRACK_RECORD, "S")).toBeNull();
  });

  it("opens M after two done S and L after one done M", () => {
    expect(DEFAULT_CLAIM_POLICY).toEqual({ minSForM: 2, minMForL: 1 });
    expect(canClaim(DEFAULT_CLAIM_POLICY, { S: 1, M: 0, L: 0 }, "M")).toBe(false);
    expect(canClaim(DEFAULT_CLAIM_POLICY, { S: 2, M: 0, L: 0 }, "M")).toBe(true);
    expect(canClaim(DEFAULT_CLAIM_POLICY, { S: 2, M: 0, L: 0 }, "L")).toBe(false);
    expect(canClaim(DEFAULT_CLAIM_POLICY, { S: 2, M: 1, L: 0 }, "L")).toBe(true);
  });

  it("explains the refusal with the need and the have", () => {
    expect(claimRefusal(DEFAULT_CLAIM_POLICY, { S: 1, M: 0, L: 0 }, "M")).toEqual({
      needSize: "S",
      need: 2,
      have: 1,
    });
    expect(claimRefusal(DEFAULT_CLAIM_POLICY, { S: 2, M: 0, L: 0 }, "L")).toEqual({
      needSize: "M",
      need: 1,
      have: 0,
    });
  });

  it("counts done tickets of the assignee and never closed ones", () => {
    const queue = [
      ticket({ key: "DOS-1", project: "swearjar-dos", size: "S", status: "done", assignee: ken }),
      ticket({ key: "DOS-2", project: "swearjar-dos", size: "S", status: "done", assignee: ken }),
      ticket({ key: "DOS-3", project: "swearjar-dos", size: "M", status: "done", assignee: ken }),
      // Closed is a cancellation, not experience.
      ticket({ key: "DOS-4", project: "swearjar-dos", size: "S", status: "closed", assignee: ken }),
      // Done by another member does not count.
      ticket({ key: "DOS-5", project: "swearjar-dos", size: "S", status: "done", assignee: ada }),
      // Open work does not count either.
      ticket({ key: "DOS-6", project: "swearjar-dos", size: "S", status: "open", assignee: ken }),
    ];
    expect(countDoneBySize(queue, "ken")).toEqual({ S: 2, M: 1, L: 0 });
    expect(countDoneBySize(queue, "ada")).toEqual({ S: 1, M: 0, L: 0 });
    expect(countDoneBySize(queue, "lin")).toEqual(EMPTY_TRACK_RECORD);
  });

  it("keeps a demo record behind every rung of the ladder", async () => {
    const queue = await listTickets();
    // lin carries two done S (TOOL-1, DOS-6): M is open to her.
    const lin = countDoneBySize(queue, "lin");
    expect(lin.S).toBeGreaterThanOrEqual(DEFAULT_CLAIM_POLICY.minSForM);
    expect(canClaim(DEFAULT_CLAIM_POLICY, lin, "M")).toBe(true);
    // grace carries a done M (DOS-5): L is open to her.
    const grace = countDoneBySize(queue, "grace");
    expect(grace.M).toBeGreaterThanOrEqual(DEFAULT_CLAIM_POLICY.minMForL);
    expect(canClaim(DEFAULT_CLAIM_POLICY, grace, "L")).toBe(true);
    // ada holds no done ticket: M and L stay closed to her.
    const adaRecord = countDoneBySize(queue, "ada");
    expect(canClaim(DEFAULT_CLAIM_POLICY, adaRecord, "M")).toBe(false);
    expect(canClaim(DEFAULT_CLAIM_POLICY, adaRecord, "L")).toBe(false);
    // ken's archive is closed, not done: it never opens a rung.
    const kenRecord = countDoneBySize(queue, "ken");
    expect(canClaim(DEFAULT_CLAIM_POLICY, kenRecord, "M")).toBe(false);
  });
});
