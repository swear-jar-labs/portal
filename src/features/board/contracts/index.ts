// The board's contract: the only surface other features import. It is a
// manifest, not an implementation: explicit re-exports of the slice's
// internals, nothing else. The contract test pins the published list.

export type { ThreadSummary } from "../threads";
export { listThreadSummariesByAuthor } from "../data";
export { ThreadRows } from "../ThreadRows";
