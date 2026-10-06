import type { BoardState } from "./board-store";

export type ForumActivitySeed = {
  posts: number;
  replies: readonly { threadId: string; postId: string }[];
};

export type ForumActivityCounts = { posts: number; replies: number };

/** Seed contributions plus live session changes; a deleted reply drops from
 * the count. Session replies the revalidated seed already echoes (same
 * post id) count once — the profile seed refreshes under the SPA session,
 * so without the filter every confirmed reply would double for the whole
 * session, not just a window. */
export function forumActivityCounts(
  user: string,
  seed: ForumActivitySeed,
  state: BoardState,
): ForumActivityCounts {
  const posts = seed.posts;
  const fixtureReplies = seed.replies.filter(
    ({ threadId, postId }) => !state.threads[threadId]?.deletedPosts.has(postId),
  ).length;
  const echoedIds = new Set(seed.replies.map(({ postId }) => postId));
  const sessionReplies = Object.values(state.threads).reduce(
    (count, thread) =>
      count +
      thread.addedPosts.filter(
        (post) =>
          post.author.user === user && !thread.deletedPosts.has(post.id) && !echoedIds.has(post.id),
      ).length,
    0,
  );
  return { posts, replies: fixtureReplies + sessionReplies };
}
