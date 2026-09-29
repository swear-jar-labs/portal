import type { Actor } from "@/features/account/contracts";
import {
  projectContentSchema,
  resolveProjectScreenshots,
  type ProjectContentInput,
  type ProjectContentResult,
} from "../model/project-content";
import type { ForgeId, Project } from "../model/projects";
import { projectTeams } from "./team-store";

const FORGE_BY_HOST = new Map<string, ForgeId>([
  ["github.com", "github"],
  ["gitlab.com", "gitlab"],
]);

function forgeForRepository(url: string | undefined): ForgeId | undefined {
  if (!url) return undefined;
  try {
    return FORGE_BY_HOST.get(new URL(url).hostname);
  } catch {
    return undefined;
  }
}

/** Approved details over fixture and proposal bases, lasting for one server process. */
export function createProjectContentStore() {
  const changes = new Map<string, Project>();

  return {
    view(base: Project): Project {
      return (
        changes.get(base.slug) ?? {
          ...base,
          contentVersion: 1,
          screenshots: base.screenshots ?? [],
        }
      );
    },
    update(base: Project, actor: Actor | null, input: ProjectContentInput): ProjectContentResult {
      const current = this.view(base);
      if (!actor) return { ok: false, error: "forbidden" };
      const team = projectTeams.view(base);
      const allowed =
        actor.admin ||
        team.lead?.user === actor.user ||
        team.maintainers.some((person) => person.user === actor.user);
      if (!allowed) return { ok: false, error: "forbidden" };
      const parsed = projectContentSchema.safeParse(input);
      if (!parsed.success || parsed.data.slug !== base.slug) return { ok: false, error: "invalid" };
      if (parsed.data.version !== current.contentVersion) return { ok: false, error: "conflict" };
      const screenshots = resolveProjectScreenshots(
        current.screenshots ?? [],
        parsed.data.screenshots,
      );
      if (!screenshots) return { ok: false, error: "invalid" };
      const repoUrl = parsed.data.repoUrl || undefined;
      const siteUrl = parsed.data.siteUrl || undefined;
      const repositoryChanged = repoUrl !== current.repoUrl;
      const next: Project = {
        ...current,
        name: parsed.data.name,
        description: parsed.data.description,
        techs: parsed.data.techs,
        contributors: parsed.data.contributors || undefined,
        repoUrl,
        siteUrl,
        forge: repositoryChanged ? forgeForRepository(repoUrl) : current.forge,
        stats: repositoryChanged ? undefined : current.stats,
        screenshots,
        contentVersion: (current.contentVersion ?? 1) + 1,
      };
      changes.set(base.slug, next);
      return { ok: true, project: next };
    },
    reset(): void {
      changes.clear();
    },
  };
}

export const projectContent = createProjectContentStore();
