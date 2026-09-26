import { describe, expect, it } from "vitest";
import { getOwnProfile } from "@/features/account/data";

describe("getOwnProfile", () => {
  it("returns the profile with the actor standing", async () => {
    const member = await getOwnProfile("ada", { level: "member", admin: false });
    expect(member.user).toBe("ada");
    expect(member.role).toBe("member");
    expect(member.admin).toBe(false);

    const participant = await getOwnProfile("quinn", { level: "participant", admin: false });
    expect(participant.role).toBe("participant");

    const admin = await getOwnProfile("admin", { level: "member", admin: true });
    expect(admin.admin).toBe(true);
  });
});
