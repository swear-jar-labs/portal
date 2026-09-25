import { describe, expect, it } from "vitest";
import * as inboxContract from "@/features/inbox/contracts";

describe("inbox contract", () => {
  it("publishes exactly the agreed surface", () => {
    expect(Object.keys(inboxContract).sort()).toEqual(["enqueueInboxEvent"]);
  });
});
