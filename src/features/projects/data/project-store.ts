import type { ClaimPolicy, ProjectSlug } from "../model/projects";

// The projects' session memory: the maintainers' tuned ladders over the
// fixtures. It outlives the route remount and dies with the page reload, like
// the tickets' store. Phase 5 replaces the setter with a server action.
export type ProjectPolicyState = {
  policies: Partial<Record<ProjectSlug, ClaimPolicy>>;
};

const INITIAL_PROJECT_POLICY_STATE: ProjectPolicyState = { policies: {} };

let state: ProjectPolicyState = INITIAL_PROJECT_POLICY_STATE;
const listeners = new Set<() => void>();

function setState(next: ProjectPolicyState): void {
  state = next;
  for (const listener of listeners) listener();
}

export function subscribeProjectStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function projectStoreSnapshot(): ProjectPolicyState {
  return state;
}

export function projectStoreServerSnapshot(): ProjectPolicyState {
  return INITIAL_PROJECT_POLICY_STATE;
}

/** Test isolation for the module-level UI-first session. */
export function resetProjectStore(): void {
  state = INITIAL_PROJECT_POLICY_STATE;
}

/** The maintainer's tuned ladder for a project. */
export function setClaimPolicy(slug: ProjectSlug, policy: ClaimPolicy): void {
  setState({ policies: { ...state.policies, [slug]: policy } });
}

/** The ladder the queue gates on: the session's tune over the fixture base. */
export function policyForProject(
  slug: ProjectSlug,
  base: ClaimPolicy,
  watched: ProjectPolicyState,
): ClaimPolicy {
  return watched.policies[slug] ?? base;
}

export type ProjectPolicyBase = { slug: ProjectSlug; claimPolicy: ClaimPolicy };

/** Every project's live ladder: the fixture bases with the session's tunes.
 * The tickets' stack reads it, so a tuned ladder gates the dossier without
 * touching the tracker pages (which stay server-rendered). */
export function livePoliciesByProject(
  projects: readonly ProjectPolicyBase[],
  watched: ProjectPolicyState,
): Partial<Record<ProjectSlug, ClaimPolicy>> {
  return Object.fromEntries(
    projects.map((project) => [
      project.slug,
      policyForProject(project.slug, project.claimPolicy, watched),
    ]),
  );
}
