import { describe, expect, it } from "vitest";

import { createAccountRegistry } from "@/features/account/model/actor";
import { isAdmin, isSignedIn, meetsLevel } from "@/features/account/model/gates";

const accounts = createAccountRegistry([
  { user: "ada", level: "member" },
  { user: "admin", level: "member", admin: true },
  { user: "newcomer", level: "participant" },
]);

describe("server gates", () => {
  it("treats only non-null actors as signed in", () => {
    expect(isSignedIn(accounts.resolve("ada"))).toBe(true);
    expect(isSignedIn(null)).toBe(false);
  });

  it("ranks member above participant", () => {
    expect(meetsLevel(accounts.resolve("ada"), "participant")).toBe(true);
    expect(meetsLevel(accounts.resolve("ada"), "member")).toBe(true);
    expect(meetsLevel(accounts.resolve("newcomer"), "participant")).toBe(true);
    expect(meetsLevel(accounts.resolve("newcomer"), "member")).toBe(false);
    expect(meetsLevel(null, "participant")).toBe(false);
  });

  it("reads the admin flag, never the level", () => {
    expect(isAdmin(accounts.resolve("admin"))).toBe(true);
    expect(isAdmin(accounts.resolve("ada"))).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});
