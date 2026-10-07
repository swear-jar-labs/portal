"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useLoginPrompt, useShellSession } from "@/features/shell";
import {
  buildReplyEvents,
  enqueueInboxEvent,
  useMentionNotifier,
} from "@/features/inbox/contracts";
import { avatarFor } from "@/shared/members";
import * as boardStore from "../data/board-store";
import { useStagedVoteActor } from "../data/useStagedVoteActor";
import {
  commitReply,
  syncPostDelete,
  syncPostEdit,
  syncPostVote,
  syncThreadVote,
} from "../data/thread-mutations";
import { boardTitle, threadPath, type BoardId } from "../model/threads";
import { ThreadActionsProvider, type ThreadActions } from "../data/thread-actions";

export type ThreadOverlayActionsProps = {
  threadId: string;
  // The fixture facts behind the layer, for the mention notices: the provider
  // binds the store without the section stack around.
  title: string;
  board: BoardId;
  threadAuthor: string;
  // Fixture post authors by post id, for reply notices without the feed around.
  postAuthors: Readonly<Record<string, string>>;
  // The fixture flags behind the layer: the provider merges the session's
  // admin overrides over them, like the section stack does for its summaries.
  pinned: boolean;
  locked: boolean;
  // The actor's vote behind the layer, read with the thread: the pressed
  // state renders from this server truth plus the staged overlay, so the
  // layer survives the revalidation that follows a vote.
  voted: boolean;
  // The RSC-rendered thread panel: it renders here, so the provider's context
  // reaches its client leaves under any host stack.
  children: ReactNode;
};

/**
 * The open thread's actions for a thread that arrives as an overlay layer:
 * the section stack's own provider is not around when the layer is hosted by
 * another section (a journal thread over the projects feed), so the layer
 * carries its own store binding.
 */
export function ThreadOverlayActions({
  threadId,
  title,
  board,
  threadAuthor,
  postAuthors,
  pinned,
  locked,
  voted,
  children,
}: ThreadOverlayActionsProps) {
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const notifyMentions = useMentionNotifier();
  useStagedVoteActor(session?.user ?? null);
  const state = useSyncExternalStore(
    boardStore.subscribeBoard,
    boardStore.boardSnapshot,
    boardStore.boardServerSnapshot,
  );

  const actions = useMemo<ThreadActions>(() => {
    const author =
      session === null
        ? null
        : { user: session.user, role: "member" as const, avatar: avatarFor(session.user) };
    const gate = (action: () => void) => {
      if (session === null) {
        requestLogin();
        return;
      }
      action();
    };
    // Pin/lock belong to admins alone, like in the section stack's own
    // provider: the controls hide for anyone else, the transitions no-op.
    const admin = session?.admin === true;
    const flags = state.flags[threadId];
    const pinnedNow = flags?.pinned ?? pinned;
    const lockedNow = flags?.locked ?? locked;
    const notify = (messageId: string, body: string) => {
      if (author === null) return;
      notifyMentions({
        authorUser: author.user,
        messageId,
        body,
        source: boardTitle(board),
        context: title,
        target: { kind: "thread", label: title, href: threadPath(threadId) },
      });
    };
    return {
      state: boardStore.threadStateOf(state, threadId),
      votedThread: boardStore.threadVotePressed(voted, state, threadId),
      pinned: pinnedNow,
      locked: lockedNow,
      canModerate: admin,
      onToggleThreadVote: () => gate(() => syncThreadVote(threadId, voted)),
      onTogglePostVote: (postId) => gate(() => syncPostVote(threadId, postId)),
      onEditPost: (postId, body) => {
        syncPostEdit(threadId, postId, body);
        notify(postId, body);
      },
      onDeletePost: (postId) => syncPostDelete(threadId, postId),
      onTogglePin: () => {
        if (!admin) return;
        boardStore.setThreadFlag(threadId, "pinned", !pinnedNow);
      },
      onToggleLock: () => {
        if (!admin) return;
        boardStore.setThreadFlag(threadId, "locked", !lockedNow);
      },
      onReply: (body, replyTo) => {
        if (author === null) return;
        const authorNow = author;
        void commitReply(threadId, authorNow, body, replyTo).then((post) => {
          if (post === undefined) return;
          notify(post.id, body);
          const sessionParent = boardStore
            .boardSnapshot()
            .threads[threadId]?.addedPosts.find((entry) => entry.id === replyTo)?.author.user;
          const at = new Date().toISOString();
          for (const delivery of buildReplyEvents({
            postId: post.id,
            threadTitle: title,
            boardLabel: boardTitle(board),
            actorUser: authorNow.user,
            actorName: authorNow.user,
            threadAuthor,
            parentAuthor:
              replyTo === undefined ? undefined : (postAuthors[replyTo] ?? sessionParent),
            target: { kind: "thread", label: title, href: threadPath(threadId) },
            at,
          }))
            enqueueInboxEvent(delivery.user, delivery.event);
        });
      },
    };
  }, [
    board,
    locked,
    notifyMentions,
    pinned,
    postAuthors,
    requestLogin,
    session,
    state,
    threadAuthor,
    threadId,
    title,
    voted,
  ]);

  return <ThreadActionsProvider actions={actions}>{children}</ThreadActionsProvider>;
}
