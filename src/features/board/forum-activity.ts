import type { BoardState } from "./board-store";

export type ForumActivitySeed = {
  posts: number;
  replies: readonly { threadId: string; postId: string }[];
};

export type ForumActivityCounts = { posts: number; replies: number };

export function localForumThreads(user: string, state: BoardState) {
  return state.addedThreads
    .filter((thread) => thread.author.user === user)
    .map(({ id, title }) => ({ id, title }))
    .reverse();
}

/** Fixture contributions plus live session changes; a deleted reply drops from the count. */
export function forumActivityCounts(
  user: string,
  seed: ForumActivitySeed,
  state: BoardState,
): ForumActivityCounts {
  const posts =
    seed.posts + state.addedThreads.filter((thread) => thread.author.user === user).length;
  const fixtureReplies = seed.replies.filter(
    ({ threadId, postId }) => !state.threads[threadId]?.deletedPosts.has(postId),
  ).length;
  const sessionReplies = Object.values(state.threads).reduce(
    (count, thread) =>
      count +
      thread.addedPosts.filter(
        (post) => post.author.user === user && !thread.deletedPosts.has(post.id),
      ).length,
    0,
  );
  return { posts, replies: fixtureReplies + sessionReplies };
}
