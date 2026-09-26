"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useLoginPrompt, useShellSession } from "@/features/shell";
import { avatarFor } from "@/shared/members";
import * as boardStore from "../data/board-store";
import { ThreadActionsProvider, type ThreadActions } from "../data/thread-actions";

export type ThreadOverlayActionsProps = {
  threadId: string;
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
export function ThreadOverlayActions({ threadId, children }: ThreadOverlayActionsProps) {
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
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
    return {
      state: boardStore.threadStateOf(state, threadId),
      votedThread: state.votedThreads.has(threadId),
      onToggleThreadVote: () => gate(() => boardStore.toggleThreadVote(threadId)),
      onTogglePostVote: (postId) => gate(() => boardStore.togglePostVote(threadId, postId)),
      onEditPost: (postId, body) => boardStore.editPost(threadId, postId, body),
      onDeletePost: (postId) => boardStore.deletePost(threadId, postId),
      onReply: (body, replyTo) => {
        if (author !== null) boardStore.addReply(threadId, body, author, replyTo);
      },
    };
  }, [requestLogin, session, state, threadId]);

  return <ThreadActionsProvider actions={actions}>{children}</ThreadActionsProvider>;
}
