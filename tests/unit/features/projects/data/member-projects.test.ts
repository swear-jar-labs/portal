import { beforeEach, describe, expect, it } from "vitest";
import { getProject, listMemberProjects } from "@/features/projects/data/queries";
import { projectTeams } from "@/features/projects/data/team-store";
import { projectContent } from "@/features/projects/data/project-content-store";
import { resetApprovedProjects } from "@/features/projects/data/project-registry";

beforeEach(() => {
  projectTeams.reset();
  projectContent.reset();
  resetApprovedProjects();
});

describe("listMemberProjects", () => {
  it("lists fixtures by any team relation, including a lead-only archive", async () => {
    expect((await listMemberProjects("ada")).map((project) => project.slug).sort()).toEqual([
      "swearjar-dos",
      "tooling",
    ]);
    // Grace leads the flagship plan without a member seed; ken leads the
    // token-cache archive without one either. Both still count as theirs.
    expect((await listMemberProjects("grace")).map((project) => project.slug).sort()).toEqual([
      "compiler",
      "flagship",
      "swearjar-dos",
    ]);
    expect((await listMemberProjects("ken")).map((project) => project.slug).sort()).toEqual([
      "compiler",
      "token-cache",
    ]);
  });

  it("returns nothing for a stranger and follows session joins", async () => {
    expect(await listMemberProjects("nobody")).toEqual([]);
    const compiler = await getProject("compiler");
    expect(compiler).not.toBeNull();
    if (!compiler) return;
    const joined = projectTeams.join(compiler, {
      user: "nobody",
      username: "nobody",
      bio: "",
      avatar: undefined,
      level: "member",
      admin: false,
      email: null,
    });
    expect(joined).toEqual({ ok: true });
    expect((await listMemberProjects("nobody")).map((project) => project.slug)).toEqual([
      "compiler",
    ]);
  });
});
