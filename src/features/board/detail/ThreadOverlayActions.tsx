"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useLoginPrompt, useShellSession } from "@/features/shell";
import { avatarFor } from "@/shared/members";
import * as boardStore from "../data/board-store";
import { ThreadActionsProvider, type ThreadActions } from "../data/thread-actions";

export type ThreadOverlayActionsProps = {
  threadId: string;
  // The fixture flags behind the layer: the provider merges the session's
  // admin overrides over them, like the section stack does for its summaries.
  pinned: boolean;
  locked: boolean;
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
  pinned,
  locked,
  children,
}: ThreadOverlayActionsProps) {
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
    // Pin/lock belong to admins alone, like in the section stack's own
    // provider: the controls hide for anyone else, the transitions no-op.
    const admin = session?.admin === true;
    const flags = state.flags[threadId];
    const pinnedNow = flags?.pinned ?? pinned;
    const lockedNow = flags?.locked ?? locked;
    return {
      state: boardStore.threadStateOf(state, threadId),
      votedThread: state.votedThreads.has(threadId),
      pinned: pinnedNow,
      locked: lockedNow,
      canModerate: admin,
      onToggleThreadVote: () => gate(() => boardStore.toggleThreadVote(threadId)),
      onTogglePostVote: (postId) => gate(() => boardStore.togglePostVote(threadId, postId)),
      onEditPost: (postId, body) => boardStore.editPost(threadId, postId, body),
      onDeletePost: (postId) => boardStore.deletePost(threadId, postId),
      onTogglePin: () => {
        if (!admin) return;
        boardStore.setThreadFlag(threadId, "pinned", !pinnedNow);
      },
      onToggleLock: () => {
        if (!admin) return;
        boardStore.setThreadFlag(threadId, "locked", !lockedNow);
      },
      onReply: (body, replyTo) => {
        if (author !== null) boardStore.addReply(threadId, body, author, replyTo);
      },
    };
  }, [locked, pinned, requestLogin, session, state, threadId]);

  return <ThreadActionsProvider actions={actions}>{children}</ThreadActionsProvider>;
}
