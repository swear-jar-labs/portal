import { describe, expect, it } from "vitest";
import { messages } from "@/content/messages";
import { userSchema } from "@/features/account/model/schema";
import { listThreads } from "@/features/board/data/queries";
import {
  archivedProjectSlugs,
  getProject,
  listProjects,
  projectName,
} from "@/features/projects/data/queries";
import {
  isFixtureProjectSlug,
  projectSlugs,
  rankProjects,
} from "@/features/projects/model/projects";

describe("projects fixtures", () => {
  it("covers every slug and resolves every project", async () => {
    const projects = await listProjects();
    expect(projects.map((project) => project.slug).sort()).toEqual([...projectSlugs].sort());
    for (const slug of projectSlugs) {
      expect(isFixtureProjectSlug(slug)).toBe(true);
      expect(await getProject(slug), `${slug} is not resolvable`).not.toBeNull();
      expect(projectName(slug)).toBe(projects.find((project) => project.slug === slug)?.name);
    }
    expect(await getProject("no-such-project")).toBeNull();
    expect(() => projectName("no-such-project" as Parameters<typeof projectName>[0])).toThrow();
  });

  it("archives exactly the token cache", async () => {
    expect(archivedProjectSlugs).toEqual(["token-cache"]);
    const archived = await getProject("token-cache");
    expect(archived?.status).toBe("archived");
  });

  it("pairs repositories with forges by host", async () => {
    const hosts = { github: "github.com", gitlab: "gitlab.com" } as const;
    for (const project of await listProjects()) {
      if (project.repoUrl === undefined) {
        expect(project.forge, `${project.slug} has a forge without a repo`).toBeUndefined();
        expect(project.stats, `${project.slug} has stats without a repo`).toBeUndefined();
        continue;
      }
      expect(project.forge, `${project.slug} has a repo without a forge`).toBeDefined();
      const url = new URL(project.repoUrl);
      expect(url.hostname).toBe(hosts[project.forge ?? "github"]);
      expect(project.stats, `${project.slug} has a repo without stats`).toBeDefined();
    }
  });

  it("keeps stats counters honest and releases tagged", async () => {
    for (const project of await listProjects()) {
      const stats = project.stats;
      if (!stats) continue;
      expect(stats.openPrs).toBeGreaterThanOrEqual(0);
      expect(stats.merged30d).toBeGreaterThanOrEqual(0);
      expect(stats.commits7d).toBeGreaterThanOrEqual(0);
      if (stats.release) {
        expect(stats.release.tag.trim().length).toBeGreaterThan(0);
        expect(Date.parse(stats.release.at)).not.toBeNaN();
      }
      expect(Date.parse(stats.syncedAt), `${project.slug} synced out of time`).not.toBeNaN();
    }
  });

  it("mirrors the journal's freshest activity in the stats", async () => {
    const freshest = new Map<string, string>();
    for (const summary of await listThreads()) {
      const known = freshest.get(summary.board);
      if (known === undefined || Date.parse(summary.lastActivityAt) > Date.parse(known)) {
        freshest.set(summary.board, summary.lastActivityAt);
      }
    }
    for (const project of await listProjects()) {
      const journal = freshest.get(project.slug);
      if (journal === undefined) {
        expect(project.stats, `${project.slug} has stats without a journal`).toBeUndefined();
      } else {
        expect(project.stats?.lastActivityAt, `${project.slug} stats lag the journal`).toBe(
          journal,
        );
      }
    }
  });

  it("names path-safe people", async () => {
    for (const project of await listProjects()) {
      for (const person of [project.lead, ...project.maintainers].filter(
        (entry) => entry !== null,
      )) {
        expect(
          userSchema.safeParse(person.user).success,
          `${project.slug} names an unknown person: ${person.user}`,
        ).toBe(true);
      }
    }
  });

  it("stacks shared techs on every repo project", async () => {
    for (const project of await listProjects()) {
      expect(new Set(project.techs).size, `${project.slug} repeats a tech`).toBe(
        project.techs.length,
      );
      if (project.repoUrl === undefined) continue;
      expect(project.techs.length, `${project.slug} has a repo without techs`).toBeGreaterThan(0);
      for (const tech of project.techs) {
        expect(messages.readroom.tags[tech], `${project.slug} has an unlabeled tech`).toBeTypeOf(
          "string",
        );
      }
    }
  });

  it("stamps every project with a creation date", async () => {
    for (const project of await listProjects()) {
      expect(
        Date.parse(project.createdAt),
        `${project.slug} was created out of time`,
      ).not.toBeNaN();
    }
  });

  it("ranks the registry active first, the archive last", async () => {
    const projects = await listProjects();
    const activity: Record<string, string> = {};
    for (const summary of await listThreads()) {
      const known = activity[summary.board];
      if (known === undefined || Date.parse(summary.lastActivityAt) > Date.parse(known)) {
        activity[summary.board] = summary.lastActivityAt;
      }
    }
    const ranked = rankProjects(projects, activity, new Date().toISOString());
    expect(ranked.map((project) => project.slug)).toEqual([
      "swearjar-dos",
      "compiler",
      "tooling",
      "flagship",
      "token-cache",
    ]);
  });
});
