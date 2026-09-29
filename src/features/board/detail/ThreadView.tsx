"use client";

import { useState, type ReactNode } from "react";
import { Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useShellSession } from "@/features/shell";
import { targetKey, useModeration } from "@/features/moderation/contracts";
import { TextAction } from "@/shared/TextAction/TextAction";
import type { Thread } from "../model/threads";
import { excerpt } from "../model/excerpt";
import { PostItem } from "./PostItem";
import { ReplyForm } from "./ReplyForm";
import { useThreadActions, type ReplyTarget } from "../data/thread-actions";

const REPLY_EXCERPT_LENGTH = 64;

export type ThreadViewProps = {
  thread: Thread;
  now: string;
  // Markdown bodies of the fixture posts, rendered in RSC and keyed by post id;
  // session posts render through the same pipeline on the client.
  bodies?: Record<string, ReactNode>;
};

/** The open thread's body: the post list (fixture posts keep their RSC-rendered
 * Markdown) plus the session's replies, edits and tombstones. Replies stay
 * flat: the marker is the thread's only tree. The opening post stands for the
 * thread: its meta row carries the thread status and its vote control is the
 * thread vote the feed cards show. */
export function ThreadView({ thread, now, bodies = {} }: ThreadViewProps) {
  const actions = useThreadActions();
  const session = useShellSession();
  const moderation = useModeration();
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
    const parentExcerpt =
      state.deletedPosts.has(parent.id) ||
      moderation.hidden[targetKey({ kind: "post", id: parent.id })]
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

  // The thread as the session sees it: the provider merged the admin
  // pin/lock overrides over the fixture flags. The markers, the reply gate
  // and the locked notice all read it.
  const view: Thread = { ...thread, pinned: actions.pinned, locked: actions.locked };

  return (
    <Stack gap={12}>
      {actions.canModerate ? (
        <Stack direction="row" gap={6} navRow>
          <TextAction bracketed onClick={actions.onTogglePin}>
            {view.pinned ? messages.board.thread.unpin : messages.board.thread.pin}
          </TextAction>
          <TextAction bracketed onClick={actions.onToggleLock}>
            {view.locked ? messages.board.thread.unlock : messages.board.thread.lock}
          </TextAction>
        </Stack>
      ) : null}
      {posts.length === 0 ? (
        <Text role="hint">{messages.board.thread.postsEmpty}</Text>
      ) : (
        posts.map(({ post, body }) => {
          const root = post.id === thread.posts[0]?.id;
          return (
            <PostItem
              key={post.id}
              post={post}
              thread={view}
              now={now}
              body={body}
              votes={root ? thread.votes : post.votes}
              voted={root ? actions.votedThread : state.votedPosts.has(post.id)}
              editedBody={state.edits.get(post.id)}
              deleted={state.deletedPosts.has(post.id)}
              canEdit={session?.user === post.author.user}
              canReply={!view.locked}
              replyTo={post.replyTo === undefined ? undefined : resolveTarget(post.replyTo)}
              onToggleVote={
                root ? actions.onToggleThreadVote : () => actions.onTogglePostVote(post.id)
              }
              onReply={() => setReplyTargetId(post.id)}
              onEdit={(body) => actions.onEditPost(post.id, body)}
              onDelete={() => actions.onDeletePost(post.id)}
            />
          );
        })
      )}

      {view.locked ? (
        <Text role="danger">{messages.board.thread.locked}</Text>
      ) : (
        <ReplyForm onReply={submitReply} target={target} onTargetChange={setReplyTargetId} />
      )}
    </Stack>
  );
}
