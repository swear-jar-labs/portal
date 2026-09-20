import { describe, expect, expectTypeOf, it } from "vitest";
import * as membersContract from "@/features/members/contracts";
import type { MemberLinkProps } from "@/features/members/contracts";

describe("members contract", () => {
  it("publishes exactly the agreed surface", () => {
    expect(Object.keys(membersContract).sort()).toEqual([
      "EmptyMemberLayer",
      "MemberLayerLayout",
      "MemberLayerOutlet",
      "MemberLayerProvider",
      "MemberLink",
      "useMemberLayer",
    ]);
  });

  it("keeps the published link props type importable", () => {
    expectTypeOf<MemberLinkProps>().toHaveProperty("sectionPath");
  });
});
