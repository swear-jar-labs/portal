// The account slice's public surface for other features: the actor and its
// level predicates. Server readers (getActorSession) and pages stay behind
// the slice facade; the level mutation lands with the apply queue
// (ui-member-applications). No logic and no cross-feature imports live here.
export type { Actor } from "../actor";
export { actorViewer, isAdmin, isMember, isParticipant } from "../actor";
