// The projects' model: types, taxonomy, the URL canon and the pure helpers
// the slice shares. Fixtures and getters live in ./data; the contract manifest
// (contracts/index.ts) re-exports what other features consume.

import type { Tone } from "@swearjar/dos";
import type { TechId } from "@/content/techs";

// The lifecycle reads as a chip; the archive is neutral.
export const projectStatuses = ["active", "planned", "archived"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const projectStatusTones: Partial<Record<ProjectStatus, Tone>> = {
  active: "green",
  planned: "yellow",
};

// The registry: two static boards are also project journals, the flagship is
// still a plan and the cache is already an archive.
export const projectSlugs = [
  "swearjar-dos",
  "compiler",
  "tooling",
  "token-cache",
  "flagship",
] as const;
export type ProjectSlug = (typeof projectSlugs)[number];

export function isProjectSlug(value: string): value is ProjectSlug {
  return projectSlugs.some((slug) => slug === value);
}

// The forges the UI block knows (v1): hosts are github.com and gitlab.com,
// self-hosted and the smaller forges extend the union later.
export const forgeIds = ["github", "gitlab"] as const;
export type ForgeId = (typeof forgeIds)[number];

// A byline identity: the project people come from the shared member registry,
// a section role (if any) stays the section's own concern.
export type ProjectPerson = {
  user: string;
  avatar?: string;
};

// The FORGE block on the project page: repository counters only, never
// per-user statistics (RULES §15 — no karma). Phase 5 reads them from
// project_forge_stats (forge-integration); the shape stays.
export type ProjectStats = {
  openPrs: number;
  merged30d: number;
  commits7d: number;
  release?: { tag: string; at: string };
  lastActivityAt: string;
  syncedAt: string;
};

export type Project = {
  slug: ProjectSlug;
  name: string;
  description: string;
  // The stack as shared tech ids (labels in messages.readroom.tags): the card
  // shows chips, ABOUT joins them. A plan so far has none.
  techs: readonly TechId[];
  createdAt: string;
  repoUrl?: string;
  forge?: ForgeId;
  status: ProjectStatus;
  lead: ProjectPerson;
  maintainers: readonly ProjectPerson[];
  // Absent while the project has no repository (a plan so far).
  stats?: ProjectStats;
};

// The projects' URL canon: the index and the project page build links from it.
export const PROJECTS_PATH = "/projects";
export const projectPath = (slug: ProjectSlug) => `${PROJECTS_PATH}/${slug}`;

// How many journal entries the project page previews; the rest lives behind
// ALL THREADS on the project's board.
export const JOURNAL_PREVIEW_COUNT = 3;

// The journal card's contract attribute: the page marks its cards for focus
// return and walk rows, the same way board and readroom cards do.
export const PROJECTS_CARD_ATTR = "data-projects-card";

function statusRank(status: ProjectStatus): number {
  return projectStatuses.indexOf(status);
}

function activityTime(iso: string | undefined, nowMs: number): number {
  if (iso === undefined) return 0;
  // Future-dated activity (clock skew, fixture drift) never outranks the
  // present: the freshest a journal can be is now.
  return Math.min(Date.parse(iso) || 0, nowMs);
}

/** The index order: active journals by freshness, plans by name, the archive
 * last. `now` is a parameter so the ranking is pure and testable (the RSC
 * captures it once per render). */
export function rankProjects(
  projects: readonly Project[],
  activityBySlug: Readonly<Record<string, string>>,
  now: string,
): Project[] {
  const nowMs = Date.parse(now);
  return [...projects].sort((a, b) => {
    const status = statusRank(a.status) - statusRank(b.status);
    if (status !== 0) return status;
    if (a.status === "active") {
      const fresh =
        activityTime(activityBySlug[b.slug], nowMs) - activityTime(activityBySlug[a.slug], nowMs);
      if (fresh !== 0) return fresh;
    }
    if (a.name === b.name) return 0;
    return a.name < b.name ? -1 : 1;
  });
}
