// UI-first projects data: fixtures and the async getters over them. The
// projects pages consume them; when the backend lands (Phase 5), the bodies
// change to queries while the signatures stay put (TECH.md §5).

import { avatarFor } from "@/shared/members";
import { DEFAULT_CLAIM_POLICY } from "./projects";
import { approvedProject, approvedProjects } from "./project-registry";
import type { Project, ProjectPerson, ProjectSlug, ProjectStats } from "./projects";

const ada: ProjectPerson = { user: "ada", avatar: avatarFor("ada") };
const grace: ProjectPerson = { user: "grace", avatar: avatarFor("grace") };
const ken: ProjectPerson = { user: "ken" };
const lin: ProjectPerson = { user: "lin" };

// Only the sync clock is relative: last activity mirrors the board journal's
// freshest post (a test pins the match), the sync age counts from load.
const HOUR_MS = 3_600_000;
const BASE_MS = Date.now();

function hoursAgo(hours: number): string {
  return new Date(BASE_MS - hours * HOUR_MS).toISOString();
}

function stats(
  overrides: Omit<ProjectStats, "syncedAt"> & { syncedHoursAgo: number },
): ProjectStats {
  const { syncedHoursAgo, ...rest } = overrides;
  return { ...rest, syncedAt: hoursAgo(syncedHoursAgo) };
}

const projects: readonly Project[] = [
  {
    slug: "swearjar-dos",
    name: "SWEARJAR.DOS",
    createdAt: "2026-08-01T09:00:00.000Z",
    description:
      "The terminal you're using. A place to work on the workshop itself, from keyboard navigation to code review.",
    techs: ["nextjs", "postgres", "typescript"],
    repoUrl: "https://github.com/swear-jar-labs/portal",
    forge: "github",
    status: "active",
    lead: ada,
    maintainers: [ada, grace],
    claimPolicy: DEFAULT_CLAIM_POLICY,
    stats: stats({
      openPrs: 3,
      merged30d: 12,
      commits7d: 21,
      release: { tag: "v0.1", at: "2026-09-10T09:00:00.000Z" },
      lastActivityAt: "2026-09-18T09:00:00.000Z",
      syncedHoursAgo: 2,
    }),
  },
  {
    slug: "compiler",
    name: "Compiler",
    createdAt: "2026-09-01T09:00:00.000Z",
    description: "A hand-written recursive descent playground: grammars you can debug at 3am.",
    techs: ["c"],
    repoUrl: "https://github.com/swear-jar-labs/compiler",
    forge: "github",
    status: "active",
    lead: grace,
    maintainers: [grace, ken],
    claimPolicy: DEFAULT_CLAIM_POLICY,
    stats: stats({
      openPrs: 1,
      merged30d: 5,
      commits7d: 8,
      lastActivityAt: "2026-09-17T08:20:00.000Z",
      syncedHoursAgo: 3,
    }),
  },
  {
    slug: "tooling",
    name: "Tooling",
    createdAt: "2026-09-05T09:00:00.000Z",
    description: "Build caches, scripts and CI glue that refuse to poison themselves.",
    techs: ["shell", "ci"],
    repoUrl: "https://gitlab.com/swear-jar-labs/tooling",
    forge: "gitlab",
    status: "active",
    lead: ada,
    maintainers: [ada, lin],
    claimPolicy: DEFAULT_CLAIM_POLICY,
    stats: stats({
      openPrs: 2,
      merged30d: 7,
      commits7d: 4,
      lastActivityAt: "2026-09-16T06:05:00.000Z",
      syncedHoursAgo: 5,
    }),
  },
  {
    slug: "token-cache",
    name: "Token Cache",
    createdAt: "2026-07-20T09:00:00.000Z",
    description:
      "An LRU cache that learned about recency the hard way. Frozen — read, don't revive.",
    techs: ["typescript"],
    repoUrl: "https://github.com/swear-jar-labs/token-cache",
    forge: "github",
    status: "archived",
    lead: ken,
    maintainers: [lin],
    claimPolicy: DEFAULT_CLAIM_POLICY,
    stats: stats({
      openPrs: 0,
      merged30d: 0,
      commits7d: 0,
      lastActivityAt: "2026-08-30T14:00:00.000Z",
      syncedHoursAgo: 24 * 90,
    }),
  },
  {
    slug: "flagship",
    name: "Flagship",
    createdAt: "2026-09-18T09:00:00.000Z",
    description:
      "A demo proposal for a shared project: choose a problem, agree on the scope, and build it together.",
    techs: [],
    status: "planned",
    lead: grace,
    maintainers: [],
    claimPolicy: DEFAULT_CLAIM_POLICY,
  },
];

const bySlug = new Map<ProjectSlug, Project>(projects.map((project) => [project.slug, project]));

export const archivedProjectSlugs: readonly ProjectSlug[] = projects
  .filter((project) => project.status === "archived")
  .map((project) => project.slug);

/** The display name behind a project slug (and behind the project boards). */
export function projectName(slug: ProjectSlug): string {
  const project = bySlug.get(slug) ?? approvedProject(slug);
  if (!project) throw new Error(`unknown project slug: ${slug}`);
  return project.name;
}

export async function listProjects(): Promise<Project[]> {
  return [...projects, ...approvedProjects()];
}

export async function getProject(slug: string): Promise<Project | null> {
  const project = bySlug.get(slug) ?? approvedProject(slug);
  return project ?? null;
}

export function isKnownProjectSlug(slug: string): slug is ProjectSlug {
  return bySlug.has(slug) || approvedProject(slug) !== null;
}
