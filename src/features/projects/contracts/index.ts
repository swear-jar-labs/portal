// The projects' contract: the only surface other features import. It is a
// manifest, not an implementation: explicit re-exports of the slice's
// internals, nothing else. The contract test pins the published list.

export {
  archivedProjectSlugs,
  getProject,
  isKnownProjectSlug,
  listProjects,
  projectName,
} from "../data";
export {
  DEFAULT_CLAIM_POLICY,
  dynamicTicketPrefix,
  fixtureTicketPrefixes,
  MAX_POLICY_NEED,
  MIN_POLICY_NEED,
  isFixtureProjectSlug,
  projectPath,
  projectSlugs,
  projectTeamManagePath,
} from "../projects";
export {
  livePoliciesByProject,
  policyForProject,
  projectStoreServerSnapshot,
  projectStoreSnapshot,
  subscribeProjectStore,
} from "../project-store";
export type { ClaimPolicy, FixtureProjectSlug, ProjectSlug } from "../projects";
export type { ProjectPolicyBase } from "../project-store";
export type { Project, ProjectPerson } from "../projects";
export { decideProject, listProjectSubmissions } from "../mock-submissions";
export { MAX_PROJECT_NOTE_LENGTH } from "../submissions";
export type { ProjectSubmission, SubmissionError } from "../submissions";
