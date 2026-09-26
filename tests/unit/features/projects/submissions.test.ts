import { afterEach, describe, expect, it } from "vitest";
import { techIds } from "@/content/techs";
import type { Actor } from "@/features/account/contracts";
import { makeComposeSchema } from "@/features/board/schema";
import { getProject, isKnownProjectSlug, listProjects } from "@/features/projects/data";
import { resetApprovedProjects } from "@/features/projects/project-registry";
import {
  createProjectSubmissionStore,
  projectSubmissionSchema,
} from "@/features/projects/submissions";
import { makeTicketComposeSchema } from "@/features/tickets/schema";
import { nextTicketKey } from "@/features/tickets/tickets";

const member: Actor = {
  user: "builder",
  username: "builder",
  bio: "",
  avatar: undefined,
  level: "member",
  admin: false,
  email: null,
};
const other: Actor = {
  user: "other",
  username: "other",
  bio: "",
  avatar: undefined,
  level: "member",
  admin: false,
  email: null,
};
const participant: Actor = { ...member, level: "participant" };
const admin: Actor = {
  user: "admin",
  username: "admin",
  bio: "",
  avatar: undefined,
  level: "member",
  admin: true,
  email: null,
};
const input = {
  slug: "new-workshop",
  name: "New Workshop",
  goal: "A shared workshop for debugging small tools together.",
  repoUrl: "https://github.com/example/workshop",
  stack: ["typescript", "rust"],
  contributors: "Looking for members to build tests and improve documentation.",
};

afterEach(() => resetApprovedProjects());

describe("project submissions", () => {
  it("accepts only unique technologies from the shared catalog", () => {
    expect(projectSubmissionSchema.safeParse({ ...input, stack: [] }).success).toBe(false);
    expect(
      projectSubmissionSchema.safeParse({ ...input, stack: ["typescript", "typescript"] }).success,
    ).toBe(false);
    expect(projectSubmissionSchema.safeParse({ ...input, stack: ["unknown"] }).success).toBe(false);
    expect(
      projectSubmissionSchema.safeParse({ ...input, stack: techIds.slice(0, 11) }).success,
    ).toBe(false);
    expect(projectSubmissionSchema.safeParse(input).success).toBe(true);
  });
  it("guards actors, versions and the clarification roundtrip", () => {
    const store = createProjectSubmissionStore();
    expect(store.submit(participant, input)).toEqual({ ok: false, error: "forbidden" });
    const submitted = store.submit(member, input);
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    const { id } = submitted.submission;
    expect(store.all(member)).toEqual([]);
    expect(store.respond(member, "project-999", 1, "reply")).toEqual({
      ok: false,
      error: "missing",
    });
    expect(store.decide(admin, "project-999", 1, "approved", "")).toEqual({
      ok: false,
      error: "missing",
    });
    expect(store.respond(other, id, 1, "reply")).toEqual({ ok: false, error: "forbidden" });
    expect(store.decide(member, id, 1, "approved", "")).toEqual({ ok: false, error: "forbidden" });
    expect(store.decide(admin, id, 1, "clarification-requested", "")).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(store.decide(admin, id, 1, "clarification-requested", "Who handles releases?").ok).toBe(
      true,
    );
    expect(store.decide(admin, id, 1, "approved", "")).toEqual({ ok: false, error: "conflict" });
    expect(store.respond(member, id, 2, "I will handle releases.").ok).toBe(true);
    expect(store.decide(admin, id, 3, "approved", "").ok).toBe(true);
    expect(store.respond(member, id, 4, "again")).toEqual({ ok: false, error: "conflict" });
    expect(store.forUser(member.user)[0]?.history.map((event) => event.kind)).toEqual([
      "submitted",
      "clarification-requested",
      "clarification-sent",
      "approved",
    ]);
  });

  it("publishes one project with lead and initial Maintainer and reaches dependent selectors", async () => {
    const store = createProjectSubmissionStore();
    const submitted = store.submit(member, input);
    if (!submitted.ok) throw new Error("submission failed");
    expect(store.decide(admin, submitted.submission.id, 1, "approved", "").ok).toBe(true);
    expect(store.decide(admin, submitted.submission.id, 1, "approved", "")).toEqual({
      ok: false,
      error: "conflict",
    });
    const project = await getProject(input.slug);
    expect(project).toMatchObject({
      slug: input.slug,
      lead: { user: member.user },
      maintainers: [{ user: member.user }],
    });
    expect(project?.stats).toBeUndefined();
    expect(project?.techs).toEqual(input.stack);
    expect((await listProjects()).filter((entry) => entry.slug === input.slug)).toHaveLength(1);
    expect(isKnownProjectSlug(input.slug)).toBe(true);
    expect(nextTicketKey(input.slug, [])).toMatch(/^[A-Z0-9]{2,8}-1$/);
    expect(
      makeTicketComposeSchema([input.slug]).safeParse({
        project: input.slug,
        title: "First task",
        body: "Do it",
        size: "S",
        priority: "normal",
        tags: [],
      }).success,
    ).toBe(true);
    expect(
      makeComposeSchema([input.slug]).safeParse({
        board: input.slug,
        title: "First thread",
        body: "Hi",
        tags: [],
      }).success,
    ).toBe(true);
  });

  it("retains rejection history and refuses occupied or malformed slugs", () => {
    const store = createProjectSubmissionStore();
    expect(projectSubmissionSchema.safeParse({ ...input, slug: "Bad Slug" }).success).toBe(false);
    expect(projectSubmissionSchema.safeParse({ ...input, slug: "propose" }).success).toBe(false);
    expect(store.submit(member, { ...input, slug: "compiler" })).toEqual({
      ok: false,
      error: "slug-taken",
    });
    const first = store.submit(member, input);
    if (!first.ok) throw new Error("submission failed");
    expect(store.submit(member, input)).toEqual({ ok: false, error: "conflict" });
    expect(
      store.decide(admin, first.submission.id, 1, "rejected", "Needs a smaller scope.").ok,
    ).toBe(true);
    const second = store.submit(member, input);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.submission.id).not.toBe(first.submission.id);
    expect(store.forUser(member.user)).toHaveLength(2);
    expect(store.all(admin)).toHaveLength(2);
  });
});
