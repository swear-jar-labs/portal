import { describe, expect, it } from "vitest";
import { RUNG_TONES } from "@/features/projects/ProjectClaimSection";
import { ticketSizeTones } from "@/features/tickets/tickets";

describe("claim rung tones", () => {
  it("keeps the ABOUT table in sync with the tickets' canon", () => {
    // A direct import would cycle projects → tickets → projects, so ABOUT
    // carries its own table: this pins the two together instead.
    expect(RUNG_TONES).toEqual(ticketSizeTones);
  });
});
