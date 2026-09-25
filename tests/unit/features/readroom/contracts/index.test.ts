import { describe, expect, it } from "vitest";
import * as readroomContract from "@/features/readroom/contracts";

describe("readroom contract", () => {
  it("publishes exactly the agreed surface for the neighbour slices", () => {
    expect(Object.keys(readroomContract).sort()).toEqual([
      "hasNoteBy",
      "hasUpvoted",
      "isLead",
      "listReadroomsByTicket",
      "phaseOf",
      "upvoteCount",
      "visibleNotes",
    ]);
  });
});
