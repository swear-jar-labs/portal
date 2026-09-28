"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  summarizeThread,
  type BoardMember,
  type Thread,
  type ThreadSummary,
} from "../model/threads";
import * as boardStore from "./board-store";
import { filterThreads, rankThreads, type FeedQuery } from "../model/feed";
import { isBlankSearch, searchThreads, type ThreadSearchHit } from "../model/search";
import {
  EMPTY_SEARCH_VISIBILITY,
  effectiveSearchThreads,
  resolveSearchVisibility,
  type SearchModeration,
  type SearchViewer,
} from "./forum-search";
import type { ComposeInput } from "../model/schema";

export type BoardSessionOptions = {
  threads: readonly ThreadSummary[];
  now: string;
  query: FeedQuery;
  // The thread whose layer is open (a route thread or a composed one).
  threadId?: string;
  // The full fixture threads the mock search merges the session over. Absent
  // only where no search box renders.
  corpus?: readonly Thread[];
  // Moderation-hidden threads/posts drop out before matching and counting;
  // admins and the material's author keep seeing them.
  moderation?: SearchModeration | null;
  viewer?: SearchViewer;
};

/** The UI-first board's data layer: ranks the feed over the fixture summaries
 * and the session's composed threads, and binds the store's transitions to the
 * open thread. Under a query it searches the session-merged threads instead:
 * the same board/tag filters narrow the corpus first, the current sort still
 * orders the hit threads. Phase 5 replaces the store with server actions,
 * the components do not change. */
export function useBoardSession({
  threads,
  now,
  query,
  threadId,
  corpus = [],
  moderation = null,
  viewer = null,
}: BoardSessionOptions) {
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

  const searchActive = !isBlankSearch(query.q);

  const visibility = useMemo(
    () =>
      moderation === null
        ? EMPTY_SEARCH_VISIBILITY
        : resolveSearchVisibility(corpus, state, moderation, viewer),
    [corpus, moderation, state, viewer],
  );

  // The searchable threads for this render: the fixtures with the session's
  // composed threads, replies, edits and deletions merged in and the hidden
  // material removed. Board/tag narrow the corpus before matching, so ERRATA
  // never mixes other boards into its results.
  const searchable = useMemo(
    () =>
      effectiveSearchThreads(corpus, state, visibility).filter(
        (thread) =>
          (query.board === undefined || thread.board === query.board) &&
          (query.tags ?? []).every((tag) => thread.tags.includes(tag)) &&
          (query.techs ?? []).every((tech) => thread.techs.includes(tech)),
      ),
    [corpus, query.board, query.tags, query.techs, state, visibility],
  );

  const hits = useMemo(
    () => (searchActive ? searchThreads(searchable, query.q) : []),
    [query.q, searchActive, searchable],
  );

  const searchHits = useMemo(
    () => new Map<string, ThreadSearchHit>(hits.map((hit) => [hit.threadId, hit])),
    [hits],
  );

  const visible = useMemo(() => {
    if (!searchActive) {
      return rankThreads(filterThreads(withVotes, query), query.sort, Date.parse(now));
    }
    const hitIds = new Set(hits.map((hit) => hit.threadId));
    return rankThreads(
      withVotes.filter((summary) => hitIds.has(summary.id)),
      query.sort,
      Date.parse(now),
    );
  }, [hits, now, query, searchActive, withVotes]);

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
    (body: string, author: BoardMember, replyTo?: string) => {
      if (threadId === undefined) return;
      boardStore.addReply(threadId, body, author, replyTo);
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
    // Grouped matches by thread id under an active query, empty otherwise.
    // The panel renders one post card per visible match from them.
    searchHits,
    threadState,
    toggleThreadVote,
    togglePostVote,
    editPost,
    deletePost,
    addReply,
    addThread,
  };
}
