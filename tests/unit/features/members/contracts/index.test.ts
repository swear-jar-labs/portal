import { describe, expect, expectTypeOf, it } from "vitest";
import * as membersContract from "@/features/members/contracts";
import type { MemberPageProps } from "@/features/members/contracts";

describe("members contract", () => {
  it("publishes exactly the agreed surface", () => {
    expect(Object.keys(membersContract).sort()).toEqual(["MemberBody"]);
  });

  it("keeps the published page props type importable", () => {
    expectTypeOf<MemberPageProps>().toHaveProperty("params");
  });
});
