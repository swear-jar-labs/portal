import { describe, expect, it } from "vitest";
import * as readroomContract from "@/features/readroom/contracts";

describe("readroom contract", () => {
  it("publishes exactly the agreed reverse-list surface", () => {
    expect(Object.keys(readroomContract).sort()).toEqual(["listReadroomsByTicket"]);
  });
});
