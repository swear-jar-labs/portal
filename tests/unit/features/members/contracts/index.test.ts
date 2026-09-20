import { describe, expect, expectTypeOf, it } from "vitest";
import * as membersContract from "@/features/members/contracts";
import type { MemberPageProps } from "@/features/members/contracts";

describe("members contract", () => {
  it("publishes exactly the agreed surface", () => {
    expect(Object.keys(membersContract).sort()).toEqual([
      "EmptyMemberLayer",
      "MemberBody",
      "MemberLayerLayout",
      "MemberLayerOutlet",
      "MemberLayerProvider",
      "MemberLink",
      "useMemberLayer",
    ]);
  });

  it("keeps the published page props type importable", () => {
    expectTypeOf<MemberPageProps>().toHaveProperty("params");
  });
});
