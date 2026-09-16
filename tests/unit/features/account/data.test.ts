import { describe, expect, it } from "vitest";
import { getOwnProfile } from "@/features/account/data";

describe("getOwnProfile", () => {
  it("returns a member profile for the user", async () => {
    const profile = await getOwnProfile("ada");
    expect(profile.user).toBe("ada");
    expect(profile.role).toBe("member");
    expect(profile.stats).toHaveLength(3);
    expect(profile.activity).toEqual([]);
  });
});
