"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { summarizeThread, type BoardMember, type ThreadSummary } from "@/shared/board/threads";
import * as boardStore from "./board-store";
import { filterThreads, rankThreads, type FeedQuery } from "./feed";
import type { ComposeInput } from "./schema";

export type BoardSessionOptions = {
  threads: readonly ThreadSummary[];
  now: string;
  query: FeedQuery;
  // The thread whose layer is open (a route thread or a composed one).
  threadId?: string;
};

/** The UI-first board's data layer: ranks the feed over the fixture summaries
 * and the session's composed threads, and binds the store's transitions to the
 * open thread. The island keeps navigation and gating; Phase 5 replaces the
 * store with server actions, the components do not change. */
export function useBoardSession({ threads, now, query, threadId }: BoardSessionOptions) {
  const state = useSyncExternalStore(
    boardStore.subscribeBoard,
    boardStore.boardSnapshot,
    boardStore.boardServerSnapshot,
  );

  const summaries = useMemo(
    () =>
      boardStore.withLocalActivity(
        [...state.addedThreads.map(summarizeThread), ...threads],
        state.threads,
      ),
    [state.addedThreads, state.threads, threads],
  );

  // Votes change the visible count and the hot rank at once — the fixtures are
  // never touched, the local delta lives beside them.
  const withVotes = useMemo(
    () =>
      summaries.map((summary) =>
        state.votedThreads.has(summary.id) ? { ...summary, votes: summary.votes + 1 } : summary,
      ),
    [state.votedThreads, summaries],
  );

  const visible = useMemo(
    () => rankThreads(filterThreads(withVotes, query), query.sort, Date.parse(now)),
    [now, query, withVotes],
  );

  const toggleThreadVote = useCallback((id: string) => {
    boardStore.toggleThreadVote(id);
  }, []);

  const togglePostVote = useCallback(
    (postId: string) => {
      if (threadId === undefined) return;
      boardStore.togglePostVote(threadId, postId);
    },
    [threadId],
  );

  const editPost = useCallback(
    (postId: string, body: string) => {
      if (threadId === undefined) return;
      boardStore.editPost(threadId, postId, body);
    },
    [threadId],
  );

  const deletePost = useCallback(
    (postId: string) => {
      if (threadId === undefined) return;
      boardStore.deletePost(threadId, postId);
    },
    [threadId],
  );

  const addReply = useCallback(
    (body: string, author: BoardMember) => {
      if (threadId === undefined) return;
      boardStore.addReply(threadId, body, author);
    },
    [threadId],
  );

  const addThread = useCallback((input: ComposeInput, author: BoardMember): string => {
    return boardStore.addThread(input, author).id;
  }, []);

  const threadState =
    threadId === undefined
      ? boardStore.EMPTY_THREAD_STATE
      : boardStore.threadStateOf(state, threadId);

  return {
    state,
    visible,
    threadState,
    toggleThreadVote,
    togglePostVote,
    editPost,
    deletePost,
    addReply,
    addThread,
  };
}
