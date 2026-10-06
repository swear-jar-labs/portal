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
import * as boardActions from "../data/board-actions";
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
  children,
}: ThreadOverlayActionsProps) {
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const notifyMentions = useMentionNotifier();
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
      votedThread: state.votedThreads.has(threadId),
      pinned: pinnedNow,
      locked: lockedNow,
      canModerate: admin,
      onToggleThreadVote: () =>
        gate(() => {
          boardStore.toggleThreadVote(threadId);
          void boardActions.toggleThreadVote(threadId).then((result) => {
            if (result.ok) return;
            boardStore.toggleThreadVote(threadId);
            console.warn("[board] thread vote not saved", result.error);
          });
        }),
      onTogglePostVote: (postId) =>
        gate(() => {
          boardStore.togglePostVote(threadId, postId);
          void boardActions.togglePostVote(postId).then((result) => {
            if (result.ok) return;
            boardStore.togglePostVote(threadId, postId);
            console.warn("[board] post vote not saved", result.error);
          });
        }),
      onEditPost: (postId, body) => {
        boardStore.editPost(threadId, postId, body);
        void boardActions.editPost(postId, { body }).then((result) => {
          if (!result.ok) console.warn("[board] edit not saved", result.error);
        });
        notify(postId, body);
      },
      onDeletePost: (postId) => {
        boardStore.deletePost(threadId, postId);
        void boardActions.deletePost(postId).then((result) => {
          if (!result.ok) console.warn("[board] delete not saved", result.error);
        });
      },
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
        void (async () => {
          const result = await boardActions.replyToThread(threadId, {
            body,
            ...(replyTo === undefined ? {} : { replyTo }),
          });
          if (!result.ok) {
            console.warn("[board] reply not saved", result.error);
            return;
          }
          const post = {
            id: result.id,
            author: authorNow,
            body,
            ...(replyTo === undefined ? {} : { replyTo }),
            createdAt: result.createdAt ?? new Date().toISOString(),
            votes: 0,
          };
          boardStore.addConfirmedPost(threadId, post);
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
        })();
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
  ]);

  return <ThreadActionsProvider actions={actions}>{children}</ThreadActionsProvider>;
}
