import { isThreadHidden, targetKey } from "@/features/moderation/contracts";
import type {
  BoardId,
  BoardRoleId,
  TagId,
  Thread,
  ThreadPost,
  ThreadTechId,
} from "../model/threads";
import type { BoardState } from "./board-store";

// What the viewer must not see: moderation-hidden threads and posts, resolved
// against admin/author in the caller. The forum search drops them before
// matching, counting and fragmenting alike.
export type ForumSearchVisibility = {
  hiddenThreadIds: ReadonlySet<string>;
  hiddenPostIds: ReadonlySet<string>;
};

export const EMPTY_SEARCH_VISIBILITY: ForumSearchVisibility = {
  hiddenThreadIds: new Set(),
  hiddenPostIds: new Set(),
};

// The moderation snapshot and the viewer through the moderation contract's
// own types: the board never reaches into the moderation model directly.
export type SearchModeration = Parameters<typeof isThreadHidden>[0];
export type SearchViewer = { user: string; admin: boolean } | null;

/** Visibility resolved before matching: hidden threads drop out whole (their
 * card title is masked in the feed alike), hidden replies drop out singly
 * while the rest of the thread stays searchable — the same line the thread
 * view draws. Admins and the material's own author see everything. */
export function resolveSearchVisibility(
  corpus: readonly Thread[],
  board: BoardState,
  moderation: SearchModeration,
  viewer: SearchViewer,
): ForumSearchVisibility {
  const canSee = (author: string) => viewer?.admin === true || viewer?.user === author;
  const hiddenThreadIds = new Set<string>();
  const hiddenPostIds = new Set<string>();
  const considerPost = (id: string, author: string) => {
    if (moderation.hidden[targetKey({ kind: "post", id })] !== undefined && !canSee(author)) {
      hiddenPostIds.add(id);
    }
  };
  const considerThread = (thread: Thread) => {
    if (isThreadHidden(moderation, thread.id) && !canSee(thread.author.user)) {
      hiddenThreadIds.add(thread.id);
      return;
    }
    for (const post of thread.posts) considerPost(post.id, post.author.user);
  };
  for (const thread of corpus) considerThread(thread);
  for (const local of Object.values(board.threads)) {
    for (const post of local.addedPosts) considerPost(post.id, post.author.user);
  }
  return { hiddenThreadIds, hiddenPostIds };
}

function liveBody(post: ThreadPost, edits: ReadonlyMap<string, string>): string {
  return edits.get(post.id) ?? post.body;
}

function livePosts(
  posts: readonly ThreadPost[],
  threadId: string,
  state: BoardState,
  visibility: ForumSearchVisibility,
): ThreadPost[] {
  const local = state.threads[threadId];
  const edits = local?.edits ?? new Map<string, string>();
  const deleted = local?.deletedPosts ?? new Set<string>();
  const kept = posts.filter(
    (post) => !deleted.has(post.id) && !visibility.hiddenPostIds.has(post.id),
  );
  const keptIds = new Set(kept.map((post) => post.id));
  const added = (local?.addedPosts ?? []).filter(
    (post) =>
      // A confirmed reply the server already echoes reads from the stored
      // row, never twice.
      !keptIds.has(post.id) && !deleted.has(post.id) && !visibility.hiddenPostIds.has(post.id),
  );
  return [...kept, ...added].map((post) => ({ ...post, body: liveBody(post, edits) }));
}

/** One searchable thread: the title plus every visible reply body with the
 * reply's author and timestamp for the result rows. A structural
 * SearchableThread (the matcher never sees boards, votes or roles). */
export type ForumSearchDocument = {
  id: string;
  board: BoardId;
  tags: readonly TagId[];
  techs: readonly ThreadTechId[];
  title: string;
  createdAt: string;
  posts: { id: string; body: string; createdAt: string; author: string; role: BoardRoleId }[];
};

/** The search corpus for one render: server threads with the session's
 * replies, edits and deletions merged in; hidden threads and posts
 * (moderation) and tombstones removed before matching. Author names stay
 * live values read at render, so a future anonymization (task 10) flows
 * through without a snapshot to refresh. */
export function effectiveSearchThreads(
  corpus: readonly Thread[],
  state: BoardState,
  visibility: ForumSearchVisibility = EMPTY_SEARCH_VISIBILITY,
): ForumSearchDocument[] {
  const toDocument = (thread: Thread): ForumSearchDocument => ({
    id: thread.id,
    board: thread.board,
    tags: thread.tags,
    techs: thread.techs,
    title: thread.title,
    createdAt: thread.createdAt,
    posts: livePosts(thread.posts, thread.id, state, visibility).map((post) => ({
      id: post.id,
      body: post.body,
      createdAt: post.createdAt,
      author: post.author.user,
      role: post.author.role,
    })),
  });
  const fixture = corpus
    .filter((thread) => !visibility.hiddenThreadIds.has(thread.id))
    .map(toDocument);
  return fixture;
}
