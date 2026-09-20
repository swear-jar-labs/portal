// The board's contract: the only surface other features import. It is a
// manifest, not an implementation: explicit re-exports of the slice's
// internals, nothing else. The contract test pins the published list.

export type { BoardMember, ThreadSummary } from "../threads";
export { FEED_PATH } from "../threads";
export {
  getBoardMember,
  listRecentThreadSummariesByBoard,
  listThreadSummariesByAuthor,
} from "../data";
export { JournalRows } from "../JournalRows";
export { ThreadRows } from "../ThreadRows";
