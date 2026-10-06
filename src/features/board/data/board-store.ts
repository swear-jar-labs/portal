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
  votedThreads: ReadonlySet<string>;
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

export function toggleThreadVote(threadId: string): void {
  setState({ ...state, votedThreads: toggled(state.votedThreads, threadId) });
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
 * Rollback for a failed delete — and settle for a successful one, whose
 * server tombstone arrives with the revalidation (keeping the delta would
 * subtract the reply twice from the card count). */
export function restorePost(threadId: string, postId: string): void {
  updateThread(threadId, (current) => {
    if (!current.deletedPosts.has(postId)) return current;
    const deletedPosts = new Set(current.deletedPosts);
    deletedPosts.delete(postId);
    return { ...current, deletedPosts };
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

/** Tests only: drop the session memory back to its initial snapshot. */
export function resetBoardStore(): void {
  setState(INITIAL_BOARD_STATE);
}
