// The projects' model: types, taxonomy, the URL canon and the pure helpers
// the slice shares. Fixtures and getters live in ./data; the contract manifest
// (contracts/index.ts) re-exports what other features consume.

import type { Tone } from "@swearjar/dos";
import { messages } from "@/content/messages";
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
// Approved proposals add slugs at runtime; the fixture tuple remains the
// compile-time inventory for static data and its consistency tests. The slug
// is a URL canon, not the database identity: Phase 5 lands a UUID ProjectId
// (UI-MOCK-PLAN: backend after the UI freeze), and the slug stays a unique
// human-readable key beside it.
export type FixtureProjectSlug = (typeof projectSlugs)[number];
export type ProjectSlug = FixtureProjectSlug | (string & {});

export function isFixtureProjectSlug(value: string): value is FixtureProjectSlug {
  return projectSlugs.some((slug) => slug === value);
}

// New projects need a stable ticket code before any tickets exist. The hash
// keeps similarly named slugs distinct; approval checks it against all codes.
export function dynamicTicketPrefix(slug: string): string {
  const letters = slug
    .replace(/[^a-z]/g, "")
    .toUpperCase()
    .slice(0, 5)
    .padEnd(2, "X");
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) % 46_656;
  return `${letters}${hash.toString(36).toUpperCase().padStart(3, "0")}`;
}

export const fixtureTicketPrefixes = {
  "swearjar-dos": "DOS",
  compiler: "CMP",
  tooling: "TOOL",
  "token-cache": "CACHE",
  flagship: "FLAG",
} as const satisfies Record<FixtureProjectSlug, string>;

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
  // Markdown on the project page; the index card shows a raw clamped excerpt,
  // so the fixture text stays plain until the card renders a pipeline.
  description: string;
  // The stack as shared tech ids (labels in messages.readroom.tags): the card
  // shows chips, ABOUT joins them. A plan so far has none.
  techs: readonly TechId[];
  contributors?: string;
  createdAt: string;
  repoUrl?: string;
  forge?: ForgeId;
  status: ProjectStatus;
  lead: ProjectPerson | null;
  maintainers: readonly ProjectPerson[];
  // The claim ladder of this project (RULES §15): the fixtures carry the
  // default, the maintainers tune it per project.
  claimPolicy: ClaimPolicy;
  // Absent while the project has no repository (a plan so far).
  stats?: ProjectStats;
};

// The per-project claim ladder (RULES §15): how many done tickets of the
// junior size open the next one. S is always free. Phase 5 stores the policy
// next to requiredApprovals; the shape stays.
export type ClaimPolicy = {
  minSForM: number;
  minMForL: number;
};

// The defaults the maintainers start from: two done S open M, one done M opens L.
export const DEFAULT_CLAIM_POLICY: ClaimPolicy = { minSForM: 2, minMForL: 1 };

// The rung bounds the ABOUT form offers: 0 opens the rung to everyone.
export const MIN_POLICY_NEED = 0;
export const MAX_POLICY_NEED = 10;

// The projects' URL canon: the index and the project page build links from it.
export const PROJECTS_PATH = "/projects";
export const PROJECT_PROPOSE_PATH = `${PROJECTS_PATH}/propose`;
export const PROJECT_PROPOSE_BUTTON_ID = "projects-propose-button";
// The URL key of the manage panel; its value is PROJECT_TEAM_MANAGE_QUERY.
export const PROJECT_MANAGE_QUERY_KEY = "manage";
export const PROJECT_TEAM_MANAGE_QUERY = "team";
export const PROJECT_TEAM_MANAGE_BUTTON_ID = "project-team-manage-button";
export const PROJECT_TAB_QUERY = "tab";
export const projectTabs = ["project", "team", "activity"] as const;
export type ProjectTab = (typeof projectTabs)[number];
export const projectPath = (slug: ProjectSlug) => `${PROJECTS_PATH}/${slug}`;
export const projectTabPath = (slug: ProjectSlug, tab: ProjectTab) =>
  tab === "project" ? projectPath(slug) : `${projectPath(slug)}?${PROJECT_TAB_QUERY}=${tab}`;
export const projectTeamManagePath = (slug: ProjectSlug) =>
  `${projectTabPath(slug, "team")}&${PROJECT_MANAGE_QUERY_KEY}=${PROJECT_TEAM_MANAGE_QUERY}`;

// The project's browser tab title: the direct page's metadata and the overlay
// store (soft navigation skips the slot's metadata) share one string.
export function projectDocumentTitle(name: string): string {
  return `${name} — ${messages.metadata.title}`;
}

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
