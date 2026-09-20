// The projects' contract: the only surface other features import. It is a
// manifest, not an implementation: explicit re-exports of the slice's
// internals, nothing else. The contract test pins the published list.

export { archivedProjectSlugs, projectName } from "../data";
export { isProjectSlug, projectSlugs } from "../projects";
export type { ProjectSlug } from "../projects";
