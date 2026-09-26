// The board's contract: the only surface other features import. It is a
// manifest, not an implementation: explicit re-exports of the slice's
// internals, nothing else. The contract test pins the published list.

export type { BoardMember, ThreadSummary } from "../model/threads";
export { FEED_PATH } from "../model/threads";
export {
  countThreadsByBoard,
  forumActivitySeed,
  getBoardMember,
  listRecentThreadSummariesByBoard,
  listThreadSummariesByAuthor,
} from "../data/queries";
export { useForumActivity } from "../data/useForumActivity";
export type { ForumActivitySeed, ForumActivityCounts } from "../data/forum-activity";
export { JournalRows } from "../list/JournalRows";
export { ThreadRows } from "../list/ThreadRows";
// The upvote chip: the readroom's cards and task view vote with the same
// affordance (a leaf — kit, content and lib only, no feature imports).
export { VoteButton } from "../list/VoteButton";
export type { VoteButtonProps } from "../list/VoteButton";
