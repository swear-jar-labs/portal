import { describe, expect, it } from "vitest";
import {
  actorViewer,
  createAccountRegistry,
  isAdmin,
  isMember,
  isParticipant,
} from "@/features/account/actor";

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
      level: "member",
      admin: false,
      email: null,
    });
    expect(accounts.resolve("admin")).toEqual({
      user: "admin",
      level: "member",
      admin: true,
      email: null,
    });
  });

  it("resolves nothing for unknown handles", () => {
    expect(roster().resolve("quinn")).toBeNull();
  });

  it("provisions first contact as a participant without touching the roster", () => {
    const accounts = roster();
    expect(accounts.ensure("quinn")).toEqual({
      user: "quinn",
      level: "participant",
      admin: false,
      email: null,
    });
    expect(accounts.resolve("quinn")).toEqual({
      user: "quinn",
      level: "participant",
      admin: false,
      email: null,
    });
  });

  it("never downgrades a known account through the provision path", () => {
    const accounts = roster();
    expect(accounts.ensure("ada")).toEqual({
      user: "ada",
      level: "member",
      admin: false,
      email: null,
    });
    expect(accounts.ensure("admin")).toEqual({
      user: "admin",
      level: "member",
      admin: true,
      email: null,
    });
  });

  it("stores a verified email on provision and attaches it to email-less entries", () => {
    const accounts = roster();
    expect(accounts.ensure("quinn", "quinn@example.com").email).toBe("quinn@example.com");
    expect(accounts.emailTaken("quinn@example.com")).toBe(true);
    expect(accounts.emailTaken("nobody@example.com")).toBe(false);
    expect(accounts.ensure("ada", "ada@example.com").email).toBe("ada@example.com");
    expect(accounts.ensure("ada", "other@example.com").email).toBe("ada@example.com");
  });

  it("applies level changes through the single setLevel point", () => {
    const accounts = roster();
    accounts.ensure("quinn");
    expect(accounts.setLevel("quinn", "member")).toEqual({
      user: "quinn",
      level: "member",
      admin: false,
      email: null,
    });
    expect(accounts.resolve("quinn")?.level).toBe("member");
  });

  it("refuses to create accounts through the level path", () => {
    expect(roster().setLevel("quinn", "member")).toBeNull();
  });
});

describe("actor viewer and predicates", () => {
  it("maps guests to a null viewer and accounts to their level", () => {
    expect(actorViewer(null)).toBeNull();
    expect(actorViewer({ user: "quinn", level: "participant", admin: false, email: null })).toEqual(
      {
        level: "participant",
      },
    );
    expect(actorViewer({ user: "ada", level: "member", admin: false, email: null })).toEqual({
      level: "member",
    });
  });

  it("separates levels from admin powers", () => {
    const admin = { user: "admin", level: "member" as const, admin: true, email: null };
    const participant = { user: "quinn", level: "participant" as const, admin: false, email: null };
    expect(isParticipant(participant)).toBe(true);
    expect(isMember(participant)).toBe(false);
    expect(isMember(admin)).toBe(true);
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(participant)).toBe(false);
    expect(isParticipant(null)).toBe(false);
    expect(isMember(null)).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});
