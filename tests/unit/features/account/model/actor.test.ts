import { describe, expect, it } from "vitest";
import { createAccountRegistry } from "@/features/account/model/actor";

function roster() {
  return createAccountRegistry([
    { user: "ada", level: "member" },
    { user: "admin", level: "member", admin: true },
  ]);
}

describe("account registry", () => {
  it("resolves seeded demo accounts with their level and admin flag", () => {
    const accounts = roster();
    expect(accounts.resolve("ada")).toEqual({
      user: "ada",
      username: "ada",
      bio: "Learning how things work, one broken build at a time.",
      avatar: undefined,
      level: "member",
      admin: false,
      email: null,
    });
    expect(accounts.resolve("admin")).toEqual({
      user: "admin",
      username: "admin",
      bio: "Learning how things work, one broken build at a time.",
      avatar: undefined,
      level: "member",
      admin: true,
      email: null,
    });
  });

  it("resolves nothing for unknown handles", () => {
    expect(roster().resolve("quinn")).toBeNull();
  });

  it("indexes both the stable key and a seeded display username", () => {
    const accounts = createAccountRegistry([{ user: "ada", username: "ada-new", level: "member" }]);
    expect(accounts.resolve("ada-new")?.user).toBe("ada");
    expect(accounts.ensure("ada-new").user).toBe("ada");
  });

  it("provisions first contact as a participant without touching the roster", () => {
    const accounts = roster();
    expect(accounts.ensure("quinn")).toEqual({
      user: "quinn",
      username: "quinn",
      bio: "Learning how things work, one broken build at a time.",
      avatar: undefined,
      level: "participant",
      admin: false,
      email: null,
    });
    expect(accounts.resolve("quinn")).toEqual({
      user: "quinn",
      username: "quinn",
      bio: "Learning how things work, one broken build at a time.",
      avatar: undefined,
      level: "participant",
      admin: false,
      email: null,
    });
  });

  it("never downgrades a known account through the provision path", () => {
    const accounts = roster();
    expect(accounts.ensure("ada")).toEqual({
      user: "ada",
      username: "ada",
      bio: "Learning how things work, one broken build at a time.",
      avatar: undefined,
      level: "member",
      admin: false,
      email: null,
    });
    expect(accounts.ensure("admin")).toEqual({
      user: "admin",
      username: "admin",
      bio: "Learning how things work, one broken build at a time.",
      avatar: undefined,
      level: "member",
      admin: true,
      email: null,
    });
  });

  it("stores a verified email on creation and never rewrites a known entry", () => {
    const accounts = roster();
    expect(accounts.ensure("quinn", "quinn@example.com").email).toBe("quinn@example.com");
    expect(accounts.emailTaken("quinn@example.com")).toBe(true);
    expect(accounts.emailTaken("nobody@example.com")).toBe(false);
    // A taken handle keeps its own record: the registration flow rejects the
    // claim instead of attaching (see mock-accounts.test.ts).
    expect(accounts.ensure("ada", "ada@example.com").email).toBeNull();
    expect(accounts.emailTaken("ada@example.com")).toBe(false);
  });

  it("applies level changes through the single setLevel point", () => {
    const accounts = roster();
    accounts.ensure("quinn");
    expect(accounts.setLevel("quinn", "member")).toEqual({
      user: "quinn",
      username: "quinn",
      bio: "Learning how things work, one broken build at a time.",
      avatar: undefined,
      level: "member",
      admin: false,
      email: null,
    });
    expect(accounts.resolve("quinn")?.level).toBe("member");
  });

  it("refuses to create accounts through the level path", () => {
    expect(roster().setLevel("quinn", "member")).toBeNull();
  });

  it("flips levels through a reserved alias without moving the stable key", () => {
    const accounts = roster();
    accounts.ensure("quinn");
    accounts.updateProfile("quinn", { username: "quinn-new", bio: "" });
    expect(accounts.setLevel("quinn-new", "member")).toMatchObject({
      user: "quinn",
      username: "quinn-new",
      level: "member",
    });
    expect(accounts.resolve("quinn")?.level).toBe("member");
    expect(accounts.setLevel("nobody", "member")).toBeNull();
  });

  it("reserves old handles while preserving the stable account key and level", () => {
    const accounts = roster();
    const updated = accounts.updateProfile("ada", {
      username: "ada-new",
      bio: "New bio",
      avatar: null,
    });
    expect(updated).toMatchObject({
      ok: true,
      actor: { user: "ada", username: "ada-new", level: "member", bio: "New bio" },
    });
    expect(accounts.resolve("ada")?.user).toBe("ada");
    expect(accounts.resolve("ada-new")?.user).toBe("ada");
    expect(accounts.ensure("ada-new").user).toBe("ada");
    expect(accounts.identities().ada).toEqual({ username: "ada-new", avatar: null });
    accounts.updateProfile("ada", { username: "ada-final", bio: "New bio" });
    expect(accounts.resolve("ada-new")?.username).toBe("ada-final");
    expect(accounts.resolve("ada")?.username).toBe("ada-final");
    expect(accounts.updateProfile("admin", { username: "ada", bio: "" })).toEqual({
      ok: false,
      error: "taken",
    });
    expect(accounts.resolve("admin")?.username).toBe("admin");
  });
});
