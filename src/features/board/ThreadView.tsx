"use client";

import type { ReactNode } from "react";
import { Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useShellSession } from "@/features/shell";
import { formatAge, type Thread } from "@/shared/board/threads";
import { PostItem } from "./PostItem";
import { ReplyForm } from "./ReplyForm";
import { useThreadActions } from "./thread-actions";
import { VoteButton } from "./VoteButton";
import styles from "./board.module.css";

export type ThreadViewProps = {
  thread: Thread;
  now: string;
  // Markdown bodies of the fixture posts, rendered in RSC and keyed by post id;
  // a locally composed thread has none (plain text until the backend lands).
  bodies?: Record<string, ReactNode>;
};

function ThreadMeta({
  thread,
  now,
  voted,
  onToggleVote,
}: {
  thread: Thread;
  now: string;
  voted: boolean;
  onToggleVote: () => void;
}) {
  return (
    <Stack direction="row" gap={6} align="baseline" wrap className={styles.threadMeta}>
      {thread.pinned ? (
        <Text as="span" role="accent">
          {messages.board.card.pinned}
        </Text>
      ) : null}
      {thread.locked ? (
        <Text as="span" role="danger">
          {messages.board.card.locked}
        </Text>
      ) : null}
      <Text as="span" role="hint">
        {formatAge(thread.createdAt, now)}
      </Text>
      <VoteButton votes={thread.votes + (voted ? 1 : 0)} voted={voted} onToggle={onToggleVote} />
    </Stack>
  );
}

/** The open thread's body: the post list (fixture posts keep their RSC-rendered
 * Markdown) plus the session's replies, edits and tombstones. */
export function ThreadView({ thread, now, bodies = {} }: ThreadViewProps) {
  const actions = useThreadActions();
  const session = useShellSession();
  const { state } = actions;

  const posts = [
    ...thread.posts.map((post) => ({ post, body: bodies[post.id] })),
    ...state.addedPosts.map((post) => ({ post, body: undefined })),
  ];

  return (
    <Stack gap={12}>
      <ThreadMeta
        thread={thread}
        now={now}
        voted={actions.votedThread}
        onToggleVote={actions.onToggleThreadVote}
      />

      {posts.length === 0 ? (
        <Text role="hint">{messages.board.thread.postsEmpty}</Text>
      ) : (
        posts.map(({ post, body }) => (
          <PostItem
            key={post.id}
            post={post}
            now={now}
            body={body}
            voted={state.votedPosts.has(post.id)}
            editedBody={state.edits.get(post.id)}
            deleted={state.deletedPosts.has(post.id)}
            canEdit={session?.user === post.author.user}
            onToggleVote={() => actions.onTogglePostVote(post.id)}
            onEdit={(body) => actions.onEditPost(post.id, body)}
            onDelete={() => actions.onDeletePost(post.id)}
          />
        ))
      )}

      {thread.locked ? (
        <Text role="danger">{messages.board.thread.locked}</Text>
      ) : (
        <ReplyForm onReply={actions.onReply} />
      )}
    </Stack>
  );
}
