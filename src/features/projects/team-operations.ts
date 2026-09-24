import type { Actor } from "@/features/account/contracts";
import { getProject } from "./data";
import { projectTeams, type ProjectTeamActionId, type TeamError } from "./team-store";

export type TeamOperationResult = { ok: true } | { ok: false; error: TeamError };

/** Both project and admin server actions call the same checked mock mutation. */
export async function changeProjectTeam(
  actor: Actor | null,
  slug: string,
  action: ProjectTeamActionId,
  target: Actor | null = null,
): Promise<TeamOperationResult> {
  const project = await getProject(slug);
  if (!project) return { ok: false, error: "missing" };
  switch (action) {
    case "join":
      return projectTeams.join(project, actor);
    case "leave":
      return projectTeams.leave(project, actor);
    case "reviewer-add":
    case "reviewer-remove":
      return projectTeams.setReviewer(project, actor, target, action === "reviewer-add");
    case "appoint-maintainer":
      return projectTeams.appointMaintainer(project, actor, target);
    case "maintainer-remove":
      return projectTeams.removeMaintainer(project, actor, target);
    case "resolve-lead":
      return projectTeams.resolveLead(project, actor, target);
  }
}
