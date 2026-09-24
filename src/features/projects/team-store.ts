import type { Actor } from "@/features/account/contracts";
import { avatarFor } from "@/shared/members";
import type { Project, ProjectPerson, ProjectSlug } from "./projects";

export const projectTeamActionIds = [
  "join",
  "leave",
  "reviewer-add",
  "reviewer-remove",
  "appoint-maintainer",
  "maintainer-remove",
  "resolve-lead",
] as const;
export type ProjectTeamActionId = (typeof projectTeamActionIds)[number];

export type ProjectTeam = {
  members: readonly ProjectPerson[];
  reviewers: readonly ProjectPerson[];
  maintainers: readonly ProjectPerson[];
  lead: ProjectPerson | null;
  leadDecisionRequired: boolean;
};

export type TeamError =
  | "forbidden"
  | "archived"
  | "missing"
  | "not-member"
  | "already"
  | "not-reviewer"
  | "not-maintainer"
  | "last-maintainer"
  | "lead-decision";
export type TeamResult = { ok: true } | { ok: false; error: TeamError };

type State = {
  members: Set<string>;
  reviewers: Set<string>;
  maintainers: Set<string>;
  lead: string | null;
  leadDecisionRequired: boolean;
};

function person(user: string): ProjectPerson {
  return { user, avatar: avatarFor(user) };
}

/** Process-local mock relations. Membership, role and lead are independent.
 * The future server model needs separate relations with the same rules. */
export function createProjectTeamStore() {
  const bySlug = new Map<ProjectSlug, State>();

  function current(project: Project): State {
    const existing = bySlug.get(project.slug);
    if (existing) return existing;
    const initial: State = {
      members: new Set(project.maintainers.map((entry) => entry.user)),
      reviewers: new Set(),
      maintainers: new Set(project.maintainers.map((entry) => entry.user)),
      lead: project.lead?.user ?? null,
      leadDecisionRequired: project.lead === null,
    };
    bySlug.set(project.slug, initial);
    return initial;
  }

  function membersOf(users: Set<string>): ProjectPerson[] {
    return [...users].map(person);
  }

  return {
    view(project: Project): ProjectTeam {
      const state = current(project);
      return {
        members: membersOf(state.members),
        reviewers: membersOf(state.reviewers),
        maintainers: membersOf(state.maintainers),
        lead: state.lead === null ? null : person(state.lead),
        leadDecisionRequired: state.leadDecisionRequired,
      };
    },
    join(project: Project, actor: Actor | null): TeamResult {
      if (actor?.level !== "member") return { ok: false, error: "forbidden" };
      if (project.status === "archived") return { ok: false, error: "archived" };
      const state = current(project);
      if (state.members.has(actor.user)) return { ok: false, error: "already" };
      state.members.add(actor.user);
      return { ok: true };
    },
    leave(project: Project, actor: Actor | null): TeamResult {
      if (!actor) return { ok: false, error: "forbidden" };
      const state = current(project);
      if (!state.members.delete(actor.user)) return { ok: false, error: "not-member" };
      // Leaving is always allowed, even on an archived project: ending a
      // subscription never changes a project role or a ticket, and nobody
      // stays subscribed against their will. Only joining is closed.
      return { ok: true };
    },
    setReviewer(
      project: Project,
      actor: Actor | null,
      target: Actor | null,
      enabled: boolean,
    ): TeamResult {
      if (project.status === "archived") return { ok: false, error: "archived" };
      const state = current(project);
      if (
        !actor ||
        (!actor.admin && !state.maintainers.has(actor.user) && state.lead !== actor.user)
      ) {
        return { ok: false, error: "forbidden" };
      }
      if (target?.level !== "member") return { ok: false, error: "not-member" };
      if (enabled === state.reviewers.has(target.user)) {
        return { ok: false, error: enabled ? "already" : "not-reviewer" };
      }
      if (enabled) state.reviewers.add(target.user);
      else state.reviewers.delete(target.user);
      return { ok: true };
    },
    appointMaintainer(project: Project, actor: Actor | null, target: Actor | null): TeamResult {
      if (project.status === "archived") return { ok: false, error: "archived" };
      const state = current(project);
      if (!actor || (!actor.admin && state.lead !== actor.user)) {
        return { ok: false, error: "forbidden" };
      }
      if (target?.level !== "member") return { ok: false, error: "not-member" };
      if (state.maintainers.has(target.user)) return { ok: false, error: "already" };
      state.maintainers.add(target.user);
      return { ok: true };
    },
    removeMaintainer(project: Project, actor: Actor | null, target: Actor | null): TeamResult {
      if (project.status === "archived") return { ok: false, error: "archived" };
      const state = current(project);
      if (!actor || (!actor.admin && state.lead !== actor.user && actor.user !== target?.user)) {
        return { ok: false, error: "forbidden" };
      }
      if (!target || !state.maintainers.has(target.user)) {
        return { ok: false, error: "not-maintainer" };
      }
      if (!actor.admin && state.maintainers.size === 1) {
        return { ok: false, error: "last-maintainer" };
      }
      state.maintainers.delete(target.user);
      // The team subscription is independent of the project role.
      return { ok: true };
    },
    resolveLead(project: Project, actor: Actor | null, target: Actor | null): TeamResult {
      if (!actor?.admin) return { ok: false, error: "forbidden" };
      if (target?.level !== "member") return { ok: false, error: "not-member" };
      const state = current(project);
      if (!state.leadDecisionRequired) return { ok: false, error: "lead-decision" };
      state.lead = target.user;
      state.leadDecisionRequired = false;
      return { ok: true };
    },
    // Task 10 calls this when an account is deleted. The vacancy is kept even
    // if other Maintainers remain: no automatic lead succession.
    removeAccount(project: Project, user: string): void {
      const state = current(project);
      state.members.delete(user);
      state.reviewers.delete(user);
      state.maintainers.delete(user);
      if (state.lead === user) {
        state.lead = null;
        state.leadDecisionRequired = true;
      }
    },
    reset(): void {
      bySlug.clear();
    },
  };
}

export const projectTeams = createProjectTeamStore();
