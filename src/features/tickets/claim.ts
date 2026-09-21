// The claim ladder (RULES §15): who may take a ticket of a given size. The
// track record counts done tickets where the member is the assignee — closed
// is a cancellation, not experience, so it never counts (unlike the blocker
// gate, where done and closed both unblock). good-first stays out of the
// ladder: it is an entry tag, not a rung.

import type { ClaimPolicy } from "@/features/projects/contracts";
import type { Ticket, TicketSize } from "./tickets";

// Done tickets per size for one member, across every project.
export type TrackRecord = { S: number; M: number; L: number };

export const EMPTY_TRACK_RECORD: TrackRecord = { S: 0, M: 0, L: 0 };

/** How many done tickets of each size the member carries as assignee. */
export function countDoneBySize(tickets: readonly Ticket[], user: string): TrackRecord {
  const record: TrackRecord = { S: 0, M: 0, L: 0 };
  for (const ticket of tickets) {
    if (ticket.status !== "done") continue;
    if (ticket.assignee?.user !== user) continue;
    record[ticket.size] += 1;
  }
  return record;
}

/** Whether the record opens the given size under the project's policy. */
export function canClaim(policy: ClaimPolicy, record: TrackRecord, size: TicketSize): boolean {
  return claimRefusal(policy, record, size) === null;
}

export type ClaimRefusal = {
  // The junior size the member is short on and the numbers to show.
  needSize: TicketSize;
  need: number;
  have: number;
};

type LadderRung = { needSize: TicketSize; need: number } | null;

function ladder(policy: ClaimPolicy): Record<TicketSize, LadderRung> {
  return {
    S: null,
    M: { needSize: "S", need: policy.minSForM },
    L: { needSize: "M", need: policy.minMForL },
  };
}

/** The rung's requirement in words' numbers: null when the size is free. */
export function ladderNeed(policy: ClaimPolicy, size: TicketSize): LadderRung {
  return ladder(policy)[size];
}

/** Why the size stays closed, or null when the ladder is open. S is free. */
export function claimRefusal(
  policy: ClaimPolicy,
  record: TrackRecord,
  size: TicketSize,
): ClaimRefusal | null {
  const rung = ladder(policy)[size];
  if (rung === null) return null;
  if (record[rung.needSize] >= rung.need) return null;
  return { needSize: rung.needSize, need: rung.need, have: record[rung.needSize] };
}
