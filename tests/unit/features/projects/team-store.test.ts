import { describe, expect, it } from "vitest";
import type { Actor } from "@/features/account/contracts";
import { DEFAULT_CLAIM_POLICY, type Project } from "@/features/projects/projects";
import { createProjectTeamStore } from "@/features/projects/team-store";

const member = (user: string): Actor => ({
  user,
  username: user,
  bio: "",
  avatar: undefined,
  level: "member",
  admin: false,
  email: null,
});
const admin: Actor = {
  user: "admin",
  username: "admin",
  bio: "",
  avatar: undefined,
  level: "member",
  admin: true,
  email: null,
};
const participant: Actor = {
  user: "participant",
  username: "participant",
  bio: "",
  avatar: undefined,
  level: "participant",
  admin: false,
  email: null,
};

function project(slug: string, maintainers = ["ada"]): Project {
  return {
    slug,
    name: slug,
    description: "A project",
    techs: [],
    createdAt: "2026-09-24T00:00:00.000Z",
    status: "active",
    lead: { user: "ada" },
    maintainers: maintainers.map((user) => ({ user })),
    claimPolicy: DEFAULT_CLAIM_POLICY,
  };
}

describe("project teams and roles", () => {
  it("joins independently, refuses duplicates and leaves roles untouched", () => {
    const store = createProjectTeamStore();
    const compiler = project("compiler");
    expect(store.join(compiler, participant)).toEqual({ ok: false, error: "forbidden" });
    expect(store.join(compiler, member("grace"))).toEqual({ ok: true });
    expect(store.join(compiler, member("ken"))).toEqual({ ok: true });
    expect(store.join(compiler, member("grace"))).toEqual({ ok: false, error: "already" });
    expect(store.view(compiler).members.map((entry) => entry.user)).toEqual([
      "ada",
      "grace",
      "ken",
    ]);
    expect(store.view(compiler).reviewers).toEqual([]);
    expect(store.leave(compiler, member("grace"))).toEqual({ ok: true });
    expect(store.view(compiler).members.map((entry) => entry.user)).toEqual(["ada", "ken"]);
    expect(store.leave(compiler, member("grace"))).toEqual({ ok: false, error: "not-member" });
  });

  it("assigns Reviewer per project, independent of team membership and admin powers", () => {
    const store = createProjectTeamStore();
    const first = project("compiler");
    const second = project("tooling", ["grace"]);
    expect(store.setReviewer(first, member("ken"), member("lin"), true)).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(store.setReviewer(first, member("ada"), participant, true)).toEqual({
      ok: false,
      error: "not-member",
    });
    expect(store.setReviewer(first, member("ada"), member("ken"), true)).toEqual({ ok: true });
    expect(store.view(first).reviewers.map((entry) => entry.user)).toEqual(["ken"]);
    expect(store.view(first).members.some((entry) => entry.user === "ken")).toBe(false);
    expect(store.view(second).reviewers).toEqual([]);
    expect(store.join(first, member("ken"))).toEqual({ ok: true });
    expect(store.leave(first, member("ken"))).toEqual({ ok: true });
    expect(store.view(first).reviewers.map((entry) => entry.user)).toEqual(["ken"]);
    expect(store.setReviewer(first, member("ada"), member("ken"), false)).toEqual({ ok: true });
    expect(store.view(first).reviewers).toEqual([]);
  });

  it("lets a lead manage both project roles without holding a Maintainer seat", () => {
    const store = createProjectTeamStore();
    const first = project("lead-only", ["grace"]);
    expect(store.setReviewer(first, member("ada"), member("ken"), true)).toEqual({ ok: true });
    expect(store.appointMaintainer(first, member("ada"), member("ken"))).toEqual({ ok: true });
    expect(store.removeMaintainer(first, member("ada"), member("grace"))).toEqual({ ok: true });
    expect(store.view(first).reviewers.map((entry) => entry.user)).toEqual(["ken"]);
    expect(store.view(first).maintainers.map((entry) => entry.user)).toEqual(["ken"]);
  });

  it("holds the last Maintainer, pauses an empty project and lets admin restore it", () => {
    const store = createProjectTeamStore();
    const first = project("compiler");
    expect(store.removeMaintainer(first, member("ada"), member("ada"))).toEqual({
      ok: false,
      error: "last-maintainer",
    });
    expect(store.appointMaintainer(first, member("lin"), member("ken"))).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(store.appointMaintainer(first, member("ada"), member("ken"))).toEqual({ ok: true });
    expect(store.removeMaintainer(first, member("ada"), member("ada"))).toEqual({ ok: true });
    expect(store.view(first).maintainers.map((entry) => entry.user)).toEqual(["ken"]);
    store.removeAccount(first, "ken");
    expect(store.view(first).maintainers).toEqual([]);
    expect(store.appointMaintainer(first, admin, member("grace"))).toEqual({ ok: true });
    expect(store.view(first).maintainers.map((entry) => entry.user)).toEqual(["grace"]);
  });

  it("lets lead or admin unassign a Maintainer without ending their team subscription", () => {
    const store = createProjectTeamStore();
    const first = project("compiler", ["ada", "grace"]);
    const second = project("tooling", ["ada", "grace"]);
    expect(store.removeMaintainer(second, member("grace"), member("grace"))).toEqual({ ok: true });
    expect(store.view(second).members.map((entry) => entry.user)).toEqual(["ada", "grace"]);
    expect(store.removeMaintainer(first, member("ken"), member("grace"))).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(store.removeMaintainer(first, member("ada"), member("grace"))).toEqual({ ok: true });
    expect(store.view(first).maintainers.map((entry) => entry.user)).toEqual(["ada"]);
    expect(store.view(first).members.map((entry) => entry.user)).toEqual(["ada", "grace"]);
    expect(store.removeMaintainer(first, member("ada"), member("ada"))).toEqual({
      ok: false,
      error: "last-maintainer",
    });
    expect(store.removeMaintainer(first, admin, member("ada"))).toEqual({ ok: true });
    expect(store.view(first).maintainers).toEqual([]);
    expect(store.view(first).lead?.user).toBe("ada");
  });

  it("keeps a deleted lead vacant even when another Maintainer remains", () => {
    const store = createProjectTeamStore();
    const first = project("compiler", ["ada", "grace"]);
    store.removeAccount(first, "ada");
    expect(store.view(first).lead).toBeNull();
    expect(store.view(first).leadDecisionRequired).toBe(true);
    expect(store.view(first).maintainers.map((entry) => entry.user)).toEqual(["grace"]);
    expect(store.resolveLead(first, member("grace"), member("grace"))).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(store.resolveLead(first, admin, member("grace"))).toEqual({ ok: true });
    expect(store.view(first).lead?.user).toBe("grace");
    expect(store.view(first).leadDecisionRequired).toBe(false);
  });

  it("closes archived teams to new membership and role changes, but lets members leave", () => {
    const store = createProjectTeamStore();
    const live = project("archive");
    expect(store.join(live, member("ken"))).toEqual({ ok: true });
    const archived = { ...live, status: "archived" as const };
    expect(store.join(archived, member("lin"))).toEqual({ ok: false, error: "archived" });
    expect(store.setReviewer(archived, member("ada"), member("ken"), true)).toEqual({
      ok: false,
      error: "archived",
    });
    expect(store.removeMaintainer(archived, member("ada"), member("ada"))).toEqual({
      ok: false,
      error: "archived",
    });
    expect(store.leave(archived, member("ken"))).toEqual({ ok: true });
    expect(store.leave(archived, member("ken"))).toEqual({ ok: false, error: "not-member" });
  });
});
