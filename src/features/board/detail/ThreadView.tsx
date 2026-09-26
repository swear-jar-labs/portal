"use client";

import { useState, type ReactNode } from "react";
import { Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useShellSession } from "@/features/shell";
import { formatAge, type Thread } from "../model/threads";
import { excerpt } from "../model/excerpt";
import { PostItem } from "./PostItem";
import { ReplyForm } from "./ReplyForm";
import { useThreadActions, type ReplyTarget } from "../data/thread-actions";
import { VoteButton } from "../list/VoteButton";
import styles from "../board.module.css";

const REPLY_EXCERPT_LENGTH = 64;

export type ThreadViewProps = {
  thread: Thread;
  now: string;
  // Markdown bodies of the fixture posts, rendered in RSC and keyed by post id;
  // session posts render through the same pipeline on the client.
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
 * Markdown) plus the session's replies, edits and tombstones. Replies stay
 * flat: the marker is the thread's only tree. */
export function ThreadView({ thread, now, bodies = {} }: ThreadViewProps) {
  const actions = useThreadActions();
  const session = useShellSession();
  const { state } = actions;
  const [replyTargetId, setReplyTargetId] = useState<string | undefined>();

  const posts = [
    ...thread.posts.map((post) => ({ post, body: bodies[post.id] })),
    ...state.addedPosts.map((post) => ({ post, body: undefined })),
  ];

  // The marker and the chip quote the parent as it stands now: a session edit
  // wins over the fixture body, a tombstone keeps the name and loses the text.
  function resolveTarget(id: string): ReplyTarget | undefined {
    const parent = posts.find((entry) => entry.post.id === id)?.post;
    if (parent === undefined) return undefined;
    const parentExcerpt = state.deletedPosts.has(parent.id)
      ? ""
      : excerpt(state.edits.get(parent.id) ?? parent.body, REPLY_EXCERPT_LENGTH);
    return {
      id: parent.id,
      user: parent.author.user,
      ...(parent.author.avatar === undefined ? {} : { avatar: parent.author.avatar }),
      ...(parentExcerpt === "" ? {} : { excerpt: parentExcerpt }),
    };
  }

  const target = replyTargetId === undefined ? undefined : resolveTarget(replyTargetId);

  function submitReply(body: string, replyTo?: string) {
    actions.onReply(body, replyTo);
    setReplyTargetId(undefined);
  }

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
            canReply={!thread.locked}
            replyTo={post.replyTo === undefined ? undefined : resolveTarget(post.replyTo)}
            onToggleVote={() => actions.onTogglePostVote(post.id)}
            onReply={() => setReplyTargetId(post.id)}
            onEdit={(body) => actions.onEditPost(post.id, body)}
            onDelete={() => actions.onDeletePost(post.id)}
          />
        ))
      )}

      {thread.locked ? (
        <Text role="danger">{messages.board.thread.locked}</Text>
      ) : (
        <ReplyForm onReply={submitReply} target={target} onTargetChange={setReplyTargetId} />
      )}
    </Stack>
  );
}
