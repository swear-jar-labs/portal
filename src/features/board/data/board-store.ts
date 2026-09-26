import type { BoardMember, Thread, ThreadPost, ThreadSummary } from "../model/threads";
import type { ComposeInput } from "../model/schema";

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

export type BoardState = {
  votedThreads: ReadonlySet<string>;
  addedThreads: readonly Thread[];
  threads: Readonly<Record<string, ThreadState>>;
};

export const EMPTY_THREAD_STATE: ThreadState = {
  votedPosts: new Set(),
  edits: new Map(),
  deletedPosts: new Set(),
  addedPosts: [],
};

const INITIAL_BOARD_STATE: BoardState = {
  votedThreads: new Set(),
  addedThreads: [],
  threads: {},
};

const LOCAL_THREAD_ID_PREFIX = "local-thread-";
const LOCAL_POST_ID_PREFIX = "local-post-";

function localId(prefix: string): string {
  return `${prefix}${crypto.randomUUID()}`;
}

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

/** A session reply: authored by the logged-on member, zero votes. `replyTo`
 * names the post it answers; a thread's root reply has none. */
export function addReply(
  threadId: string,
  body: string,
  author: BoardMember,
  replyTo?: string,
): ThreadPost {
  const post: ThreadPost = {
    id: localId(LOCAL_POST_ID_PREFIX),
    author,
    body,
    ...(replyTo === undefined ? {} : { replyTo }),
    createdAt: new Date().toISOString(),
    votes: 0,
  };
  updateThread(threadId, (current) => ({ ...current, addedPosts: [...current.addedPosts, post] }));
  return post;
}

/** A thread composed in this session: one root post, no votes yet. */
export function addThread(input: ComposeInput, author: BoardMember): Thread {
  const id = localId(LOCAL_THREAD_ID_PREFIX);
  const now = new Date().toISOString();
  const thread: Thread = {
    id,
    board: input.board,
    title: input.title,
    author,
    tags: input.tags,
    pinned: false,
    locked: false,
    createdAt: now,
    votes: 0,
    posts: [{ id: `${id}-root`, author, body: input.body, createdAt: now, votes: 0 }],
  };
  setState({ ...state, addedThreads: [...state.addedThreads, thread] });
  return thread;
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
 * reply alike — so the card matches the profile's forum counter. */
export function withLocalActivity(
  summaries: readonly ThreadSummary[],
  threads: Readonly<Record<string, ThreadState>>,
): ThreadSummary[] {
  return summaries.map((summary) => {
    const local = threads[summary.id];
    if (local === undefined) return summary;
    const addedIds = new Set(local.addedPosts.map((post) => post.id));
    const liveAdded = local.addedPosts.filter((post) => !local.deletedPosts.has(post.id));
    const removedFixtures = [...local.deletedPosts].filter((id) => !addedIds.has(id)).length;
    if (liveAdded.length === 0 && removedFixtures === 0) return summary;
    return {
      ...summary,
      replies: Math.max(0, summary.replies + liveAdded.length - removedFixtures),
      lastActivityAt: liveAdded.at(-1)?.createdAt ?? summary.lastActivityAt,
    };
  });
}

/** Tests only: drop the session memory back to its initial snapshot. */
export function resetBoardStore(): void {
  setState(INITIAL_BOARD_STATE);
}
