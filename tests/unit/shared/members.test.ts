import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { avatarFor, memberAvatars } from "@/shared/members";

describe("member avatars", () => {
  it("resolves known members and leaves the rest to the letter fallback", () => {
    expect(avatarFor("ada")).toBe("/avatars/ada.png");
    expect(avatarFor("grace")).toBe("/avatars/grace.png");
    expect(avatarFor("nobody")).toBeUndefined();
  });

  it("keeps every bundled picture on disk", () => {
    for (const [user, src] of Object.entries(memberAvatars)) {
      expect(existsSync(path.join(process.cwd(), "public", src)), `${user}: ${src}`).toBe(true);
    }
  });
});
