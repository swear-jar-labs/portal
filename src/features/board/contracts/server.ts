// The board's server reads for cross-feature RSC consumers: the client-safe
// contract barrel (index.ts) must never re-export these — every module it
// pulls lands in the browser bundle. Server components import this module
// instead; it carries no "use client" and no logic, only relative
// re-exports of the data layer.
export {
  countThreadsByBoard,
  forumActivitySeed,
  getBoardMember,
  listRecentThreadSummariesByBoard,
  listTagCatalog,
  listThreadSummariesByAuthor,
} from "../data/queries";
