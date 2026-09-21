import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLAIM_POLICY,
  JOURNAL_PREVIEW_COUNT,
  PROJECTS_CARD_ATTR,
  PROJECTS_PATH,
  isProjectSlug,
  projectPath,
  projectSlugs,
  projectStatusTones,
  projectStatuses,
  rankProjects,
  type Project,
  type ProjectStatus,
} from "@/features/projects/projects";

const person = { user: "ada" };

function project(overrides: Partial<Project> & { slug: Project["slug"] }): Project {
  return {
    name: overrides.slug.toUpperCase(),
    description: "A project.",
    techs: [],
    createdAt: "2026-09-01T09:00:00.000Z",
    status: "active",
    lead: person,
    maintainers: [],
    claimPolicy: DEFAULT_CLAIM_POLICY,
    ...overrides,
  };
}

describe("projects model", () => {
  it("keeps slugs unique and guarded", () => {
    expect(new Set(projectSlugs).size).toBe(projectSlugs.length);
    expect(isProjectSlug("compiler")).toBe(true);
    expect(isProjectSlug("nope")).toBe(false);
  });

  it("tones active and planned, leaves the archive neutral", () => {
    expect(projectStatusTones satisfies Partial<Record<ProjectStatus, string>>).toEqual({
      active: "green",
      planned: "yellow",
    });
  });

  it("orders the lifecycle active, planned, archived", () => {
    expect(projectStatuses).toEqual(["active", "planned", "archived"]);
  });

  it("owns the projects URL canon", () => {
    expect(PROJECTS_PATH).toBe("/projects");
    expect(projectPath("compiler")).toBe("/projects/compiler");
  });

  it("previews three journal entries behind the ALL THREADS link", () => {
    expect(JOURNAL_PREVIEW_COUNT).toBe(3);
    expect(PROJECTS_CARD_ATTR).toBe("data-projects-card");
  });
});

describe("rankProjects", () => {
  const now = "2026-09-20T00:00:00.000Z";
  const active = (slug: Project["slug"], name = slug) => project({ slug, name, status: "active" });

  it("ranks active journals by freshness, plans by name, the archive last", () => {
    const ranked = rankProjects(
      [
        active("tooling"),
        project({ slug: "flagship", name: "Zebra", status: "planned" }),
        active("compiler"),
        project({ slug: "token-cache", name: "Cache", status: "archived" }),
        project({ slug: "flagship", name: "Alpha", status: "planned" }),
      ],
      { compiler: "2026-09-17T08:00:00.000Z", tooling: "2026-09-18T08:00:00.000Z" },
      now,
    );
    expect(ranked.map((entry) => entry.name)).toEqual([
      "tooling",
      "compiler",
      "Alpha",
      "Zebra",
      "Cache",
    ]);
  });

  it("sinks an active journal without activity below the lively ones", () => {
    const ranked = rankProjects(
      [active("tooling"), active("compiler")],
      { compiler: "2026-09-17T08:00:00.000Z" },
      now,
    );
    expect(ranked.map((entry) => entry.slug)).toEqual(["compiler", "tooling"]);
  });

  it("caps future-dated activity at now", () => {
    const ranked = rankProjects(
      [active("tooling"), active("compiler")],
      { compiler: "2026-09-19T08:00:00.000Z", tooling: "2030-01-01T00:00:00.000Z" },
      now,
    );
    expect(ranked.map((entry) => entry.slug)).toEqual(["tooling", "compiler"]);
  });
});
