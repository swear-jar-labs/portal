// The readroom's contract: the only surface other features import. It is a
// manifest, not an implementation: explicit re-exports of the slice's
// internals, nothing else. Only leaves without cross-feature imports live
// here — pages that read other contracts stay out, or the barrel would loop
// the slice graph (see AGENTS.md). The contract test pins the published list.

export { listReadroomsByTicket } from "../data";
export { listReadrooms } from "../data";
export { useReadroomSession } from "../useReadroomSession";
export type { Readroom } from "../readrooms";
export { hasNoteBy, hasUpvoted, isLead, phaseOf, upvoteCount, visibleNotes } from "../readrooms";
export type { ReadroomMode, ReadroomPhase, ReadroomRef, VisibleNotes } from "../readrooms";
