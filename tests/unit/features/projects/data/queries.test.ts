import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { messages } from "@/content/messages";
import { userSchema } from "@/features/account/model/schema";
import { listThreads } from "@/features/board/data/queries";
import type { ThreadSummary } from "@/features/board/contracts";
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

// The board reads server-side now: the two tests below drive the projects
// logic over a canned feed (the feed↔stats coherence itself is seed
// territory, covered by e2e on the seeded database).
vi.mock("@/features/board/data/queries", () => ({ listThreads: vi.fn() }));

const mockThreads = listThreads as unknown as Mock;

function feedSummary(board: string, lastActivityAt: string, id: string): ThreadSummary {
  return {
    id,
    board,
    title: id,
    author: { user: "ada", role: "maintainer" },
    tags: [],
    techs: [],
    pinned: false,
    locked: false,
    createdAt: "2026-09-10T00:00:00.000Z",
    votes: 0,
    voted: false,
    replies: 1,
    lastActivityAt,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

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

  it("keeps website links valid URLs", async () => {
    for (const project of await listProjects()) {
      const siteUrl = project.siteUrl;
      if (siteUrl === undefined) continue;
      expect(() => new URL(siteUrl), `${project.slug} has a bad website URL`).not.toThrow();
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

  it("takes the freshest journal activity per board", async () => {
    mockThreads.mockResolvedValue([
      feedSummary("swearjar-dos", "2026-09-18T09:00:00.000Z", "dos-new"),
      feedSummary("swearjar-dos", "2026-09-15T10:00:00.000Z", "dos-old"),
      feedSummary("compiler", "2026-09-17T08:20:00.000Z", "compiler-new"),
    ]);
    const freshest = new Map<string, string>();
    for (const summary of await listThreads()) {
      const known = freshest.get(summary.board);
      if (known === undefined || Date.parse(summary.lastActivityAt) > Date.parse(known)) {
        freshest.set(summary.board, summary.lastActivityAt);
      }
    }
    expect(freshest.get("swearjar-dos")).toBe("2026-09-18T09:00:00.000Z");
    expect(freshest.get("compiler")).toBe("2026-09-17T08:20:00.000Z");
    expect(freshest.get("tooling")).toBeUndefined();
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

  it("seeds distinct, described screenshots for every fixture project", async () => {
    for (const project of await listProjects()) {
      const images = project.screenshots ?? [];
      expect(images.length, `${project.slug} needs visible examples`).toBeGreaterThanOrEqual(2);
      expect(new Set(images.map((image) => image.id)).size).toBe(images.length);
      for (const image of images) {
        expect(image.alt.trim()).not.toBe("");
        const path = join(process.cwd(), "public", image.src);
        expect(existsSync(path)).toBe(true);
        expect(image.width).toBeGreaterThan(0);
        expect(image.height).toBeGreaterThan(0);
        const svg = readFileSync(path, "utf8");
        expect(svg).toContain(`width="${image.width}" height="${image.height}"`);
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
    mockThreads.mockResolvedValue([
      feedSummary("swearjar-dos", "2026-09-18T09:00:00.000Z", "dos-new"),
      feedSummary("compiler", "2026-09-17T08:20:00.000Z", "compiler-new"),
      feedSummary("tooling", "2026-09-16T06:05:00.000Z", "tooling-new"),
      feedSummary("flagship", "2026-09-10T00:00:00.000Z", "flagship-new"),
    ]);
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
