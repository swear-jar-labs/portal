import type { ThreadPost, ThreadSummary } from "../model/threads";

// The board's session memory: the mock state outlives the route remount (the
// feed unmounts when a thread opens) and dies with the page reload. The store
// owns its transitions as methods — the components call them through
// useBoardSession. Phase 5 replaces these methods with server actions.

export type ThreadState = {
  votedPosts: ReadonlySet<string>;
  // Edited bodies re-render through the client Markdown pipeline (session
  // posts keep no RSC-rendered body).
  edits: ReadonlyMap<string, string>;
  deletedPosts: ReadonlySet<string>;
  addedPosts: readonly ThreadPost[];
};

export type ThreadFlag = "pinned" | "locked";

export type ThreadFlagOverrides = Readonly<Record<string, Partial<Record<ThreadFlag, boolean>>>>;

export type BoardState = {
  // The thread vote overlay: unconfirmed intents over the server truth.
  // votedThreads stages an up-vote (optimistic +1), unvotedThreads a removal
  // (optimistic −1); both read instantly. A failed write rolls its intent
  // back, a successful one keeps it until a counter-stage or a reload — the
  // display formula neutralizes a staged intent once the server truth
  // catches up, so no ordering of the settle and the revalidation flickers
  // or double-counts. The pressed state is server truth plus this overlay
  // (see threadVoteDisplay), so a revalidation never forgets a confirmed
  // vote the way a session-only delta did.
  votedThreads: ReadonlySet<string>;
  unvotedThreads: ReadonlySet<string>;
  threads: Readonly<Record<string, ThreadState>>;
  // Admin pin/lock overrides over the fixture flags: set in this session, die
  // with the reload. Absent means the fixture flag stands.
  flags: ThreadFlagOverrides;
};

export const EMPTY_THREAD_STATE: ThreadState = {
  votedPosts: new Set(),
  edits: new Map(),
  deletedPosts: new Set(),
  addedPosts: [],
};

const INITIAL_BOARD_STATE: BoardState = {
  votedThreads: new Set(),
  unvotedThreads: new Set(),
  threads: {},
  flags: {},
};

let state: BoardState = INITIAL_BOARD_STATE;
const listeners = new Set<() => void>();

function setState(next: BoardState): void {
  state = next;
  for (const listener of listeners) listener();
}

function toggled(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(set);
  if (!next.delete(id)) next.add(id);
  return next;
}

function updateThread(threadId: string, patch: (current: ThreadState) => ThreadState): void {
  const current = state.threads[threadId] ?? EMPTY_THREAD_STATE;
  setState({ ...state, threads: { ...state.threads, [threadId]: patch(current) } });
}

function staged(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (set.has(id)) return set;
  const next = new Set(set);
  next.add(id);
  return next;
}

function unstaged(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (!set.has(id)) return set;
  const next = new Set(set);
  next.delete(id);
  return next;
}

/** Stage an up-vote: the pressed state and the counter answer at once, the
 * server confirms behind the action. Staging is exclusive — an up-vote
 * replaces a staged unvote (a re-vote before the first settle), so the
 * display always reads the latest intent. */
export function stageThreadUpvote(threadId: string): void {
  setState({
    ...state,
    votedThreads: staged(state.votedThreads, threadId),
    unvotedThreads: unstaged(state.unvotedThreads, threadId),
  });
}

/** Stage an unvote: the pressed state and the counter release at once, the
 * server confirms behind the action. Exclusive with a staged up-vote, like
 * above. */
export function stageThreadUnvote(threadId: string): void {
  setState({
    ...state,
    votedThreads: unstaged(state.votedThreads, threadId),
    unvotedThreads: staged(state.unvotedThreads, threadId),
  });
}

/** Roll back a failed thread vote: a write that never reached the server
 * leaves no staged intent behind. Success needs no transition — the staged
 * intent stays until a counter-stage or a reload, and the display formula
 * neutralizes it once the server truth catches up, so no ordering of the
 * settle and the revalidation flickers or double-counts. */
export function rollbackThreadVote(threadId: string): void {
  if (!state.votedThreads.has(threadId) && !state.unvotedThreads.has(threadId)) return;
  setState({
    ...state,
    votedThreads: unstaged(state.votedThreads, threadId),
    unvotedThreads: unstaged(state.unvotedThreads, threadId),
  });
}

export function togglePostVote(threadId: string, postId: string): void {
  updateThread(threadId, (current) => ({
    ...current,
    votedPosts: toggled(current.votedPosts, postId),
  }));
}

/** An admin pin/lock override: the feed and the open thread read the merged
 * flag, the fixtures are never touched. Rights are gated where the action is
 * bound (the thread providers); Phase 5 enforces them on the server. */
export function setThreadFlag(threadId: string, flag: ThreadFlag, value: boolean): void {
  setState({
    ...state,
    flags: { ...state.flags, [threadId]: { ...state.flags[threadId], [flag]: value } },
  });
}

export function threadFlagOf(
  snapshot: BoardState,
  threadId: string,
  flag: ThreadFlag,
): boolean | undefined {
  return snapshot.flags[threadId]?.[flag];
}

export function editPost(threadId: string, postId: string, body: string): void {
  updateThread(threadId, (current) => {
    const edits = new Map(current.edits);
    edits.set(postId, body);
    return { ...current, edits };
  });
}

export function deletePost(threadId: string, postId: string): void {
  updateThread(threadId, (current) => {
    const deletedPosts = new Set(current.deletedPosts);
    deletedPosts.add(postId);
    return { ...current, deletedPosts };
  });
}

/** Drop a session edit override: the render falls back to the stored body.
 * Rollback for a failed edit sync, which never reached the server. */
export function clearPostEdit(threadId: string, postId: string): void {
  updateThread(threadId, (current) => {
    if (!current.edits.has(postId)) return current;
    const edits = new Map(current.edits);
    edits.delete(postId);
    return { ...current, edits };
  });
}

/** Drop a session tombstone: the render falls back to the stored row.
 * Rollback for a failed delete, which never reached the server. A successful
 * delete settles through settlePostDelete instead (it forgets the confirmed
 * post as well, so the counts cannot resurrect it). */
export function restorePost(threadId: string, postId: string): void {
  updateThread(threadId, (current) => {
    if (!current.deletedPosts.has(postId)) return current;
    const deletedPosts = new Set(current.deletedPosts);
    deletedPosts.delete(postId);
    return { ...current, deletedPosts };
  });
}

/** Settle a successful delete: drop the session tombstone (the revalidated
 * server state carries the deletion) and forget the confirmed post. Without
 * the second half a reply deleted after its revalidation echoed it would haunt
 * the counts for the rest of the SPA session: the seed no longer echoes it,
 * but addedPosts still holds it, so it counts as a fresh session reply. */
export function settlePostDelete(threadId: string, postId: string): void {
  updateThread(threadId, (current) => {
    if (
      !current.deletedPosts.has(postId) &&
      !current.addedPosts.some((entry) => entry.id === postId)
    )
      return current;
    const deletedPosts = new Set(current.deletedPosts);
    deletedPosts.delete(postId);
    return {
      ...current,
      deletedPosts,
      addedPosts: current.addedPosts.filter((entry) => entry.id !== postId),
    };
  });
}

/** A server-confirmed post: the action committed it (the id is real and the
 * thread route resolves), the store renders it until the next refresh
 * revalidates the thread. `replyTo` names the post it answers; a thread's
 * root reply has none. */
export function addConfirmedPost(threadId: string, post: ThreadPost): void {
  updateThread(threadId, (current) =>
    current.addedPosts.some((entry) => entry.id === post.id)
      ? current
      : { ...current, addedPosts: [...current.addedPosts, post] },
  );
}

export function subscribeBoard(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function boardSnapshot(): BoardState {
  return state;
}

export function boardServerSnapshot(): BoardState {
  return INITIAL_BOARD_STATE;
}

export function threadStateOf(snapshot: BoardState, threadId: string): ThreadState {
  return snapshot.threads[threadId] ?? EMPTY_THREAD_STATE;
}

/** The thread vote's pressed state: server truth plus the staged overlay,
 * without the counter. Layers that render their own tally (the thread panel
 * reads the count from its RSC props) take the pressed flag from here. */
export function threadVotePressed(voted: boolean, snapshot: BoardState, threadId: string): boolean {
  return (voted || snapshot.votedThreads.has(threadId)) && !snapshot.unvotedThreads.has(threadId);
}

/** The thread vote as rendered: server truth plus the staged overlay. The
 * overlay counts exactly once — a staged up-vote adds one only while the
 * server has not counted it yet, a staged unvote subtracts one only while
 * the server still counts it — so the display stays exact however the
 * action settle and the revalidation interleave: no double count, no
 * flicker back to a stale server state. */
export function threadVoteDisplay(
  summary: Pick<ThreadSummary, "votes" | "voted">,
  snapshot: BoardState,
  threadId: string,
): { votes: number; voted: boolean } {
  const upvoted = snapshot.votedThreads.has(threadId);
  const unvoted = snapshot.unvotedThreads.has(threadId);
  return {
    votes: summary.votes + (upvoted && !summary.voted ? 1 : 0) - (unvoted && summary.voted ? 1 : 0),
    voted: threadVotePressed(summary.voted, snapshot, threadId),
  };
}

/** The feed's view of session replies: their count and the freshest activity
 * reach the card, so the list reads the same as the open thread. Tombstones
 * drop out of the count — a deleted fixture reply and a deleted session
 * reply alike — so the card matches the profile's forum counter. Server
 * posts echoed by id (the revalidated thread already includes a confirmed
 * reply) drop out too, so the reply is never counted twice. */
export function withLocalActivity(
  summaries: readonly ThreadSummary[],
  threads: Readonly<Record<string, ThreadState>>,
  serverPostIds: ReadonlyMap<string, ReadonlySet<string>> = new Map(),
): ThreadSummary[] {
  return summaries.map((summary) => {
    const local = threads[summary.id];
    if (local === undefined) return summary;
    const echoed = serverPostIds.get(summary.id);
    const addedIds = new Set(local.addedPosts.map((post) => post.id));
    const liveAdded = local.addedPosts.filter(
      (post) => !local.deletedPosts.has(post.id) && !(echoed?.has(post.id) ?? false),
    );
    const removedFixtures = [...local.deletedPosts].filter((id) => !addedIds.has(id)).length;
    if (liveAdded.length === 0 && removedFixtures === 0) return summary;
    return {
      ...summary,
      replies: Math.max(0, summary.replies + liveAdded.length - removedFixtures),
      lastActivityAt: liveAdded.at(-1)?.createdAt ?? summary.lastActivityAt,
    };
  });
}

/** Every session post keyed as echoed, by thread: commitReply adds only
 * server-confirmed posts, so surfaces without post-level server data (the
 * journal cards read summaries only, and their props are fixed by contract)
 * treat them all as echoed. Counts may lag until the refetch lands, but a
 * revalidated journal never double-counts a confirmed reply. */
export function echoedConfirmedPosts(
  threads: Readonly<Record<string, ThreadState>>,
): Map<string, ReadonlySet<string>> {
  const echoed = new Map<string, ReadonlySet<string>>();
  for (const [threadId, local] of Object.entries(threads)) {
    if (local.addedPosts.length > 0) {
      echoed.set(threadId, new Set(local.addedPosts.map((post) => post.id)));
    }
  }
  return echoed;
}

/** The feed's view of admin pin/lock overrides: a set flag replaces the
 * fixture one before ranking, so a pinned thread tops the feed and a locked
 * one reads locked on its card. Threads without an override keep their exact
 * object. */
export function withSessionFlags(
  summaries: readonly ThreadSummary[],
  flags: ThreadFlagOverrides,
): ThreadSummary[] {
  return summaries.map((summary) => {
    const override = flags[summary.id];
    if (override === undefined) return summary;
    const pinned = override.pinned ?? summary.pinned;
    const locked = override.locked ?? summary.locked;
    if (pinned === summary.pinned && locked === summary.locked) return summary;
    return { ...summary, pinned, locked };
  });
}

/** Drop staged vote intents without touching anything else: the actor
 * changed (logoff/logon inside one SPA session), so another member's
 * unconfirmed intents must not leak into the new actor's pressed state.
 * Server-confirmed votes are unaffected — they render from the queries. */
export function clearStagedThreadVotes(): void {
  if (state.votedThreads.size === 0 && state.unvotedThreads.size === 0) return;
  setState({ ...state, votedThreads: new Set(), unvotedThreads: new Set() });
}

/** Tests only: drop the session memory back to its initial snapshot. */
export function resetBoardStore(): void {
  setState(INITIAL_BOARD_STATE);
}
