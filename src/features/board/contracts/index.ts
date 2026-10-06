// The board's contract: the only surface other features import. It is a
// manifest, not an implementation: explicit re-exports of the slice's
// internals, nothing else. Client-safe by rule: every leaf here must
// resolve without server modules (@/db, node builtins), because client
// components import this barrel and anything it pulls lands in the browser
// bundle. Cross-feature RSC reads go through contracts/server.ts instead.
// Server reads live in data/queries.ts and are imported directly
// (relative, server components only) — never re-exported here. The
// contract test pins the published list; the client-graph test pins the
// boundary.

export type { BoardMember, ThreadSummary } from "../model/threads";
export { FEED_PATH } from "../model/threads";
export { useForumActivity } from "../data/useForumActivity";
export type { ForumActivitySeed, ForumActivityCounts } from "../data/forum-activity";
export { JournalRows } from "../list/JournalRows";
export { ThreadRows } from "../list/ThreadRows";
// The jar row: the shell's stats dialog renders it as an opaque addon row —
// a leaf (own store and model only, no feature imports).
export { ErrataJarRow } from "../jar/ErrataJarRow";
// The upvote chip: the readroom's cards and task view vote with the same
// affordance (a leaf — kit, content and lib only, no feature imports).
export { VoteButton } from "../list/VoteButton";
export type { VoteButtonProps } from "../list/VoteButton";
