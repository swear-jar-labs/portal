"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  summarizeThread,
  type BoardMember,
  type Thread,
  type ThreadPost,
  type ThreadSummary,
} from "../model/threads";
import * as boardStore from "./board-store";
import * as boardActions from "./board-actions";
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

/** The UI-first board's data layer: ranks the feed over the server summaries
 * and binds the store's transitions to the open thread. Votes, edits and
 * deletions apply locally first and sync to the server behind the action;
 * replies and composed threads commit server-first (their ids are real, so
 * the thread route resolves at once). Under a query it searches the
 * session-merged threads instead: the same board/tag filters narrow the
 * corpus first, the current sort still orders the hit threads. */
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

  // Admin pin/lock overrides land before the votes and the rank: a pinned
  // thread tops the feed, a locked one reads locked on its card.
  const withFlags = useMemo(
    () => boardStore.withSessionFlags(summaries, state.flags),
    [state.flags, summaries],
  );

  // Votes change the visible count and the hot rank at once — the fixtures are
  // never touched, the local delta lives beside them.
  const withVotes = useMemo(
    () =>
      withFlags.map((summary) =>
        state.votedThreads.has(summary.id) ? { ...summary, votes: summary.votes + 1 } : summary,
      ),
    [state.votedThreads, withFlags],
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

  // Optimistic session deltas with a server sync behind them: the local
  // toggle shows at once, a failed write rolls back and warns (the next
  // refresh heals either way). The guest gate lives where the action is
  // bound (the section stack prompts for logon); the server refuses guests
  // all the same.
  const toggleThreadVote = useCallback((id: string) => {
    boardStore.toggleThreadVote(id);
    void boardActions.toggleThreadVote(id).then((result) => {
      if (result.ok) return;
      boardStore.toggleThreadVote(id);
      console.warn("[board] thread vote not saved", result.error);
    });
  }, []);

  const togglePostVote = useCallback(
    (postId: string) => {
      if (threadId === undefined) return;
      boardStore.togglePostVote(threadId, postId);
      void boardActions.togglePostVote(postId).then((result) => {
        if (result.ok) return;
        boardStore.togglePostVote(threadId, postId);
        console.warn("[board] post vote not saved", result.error);
      });
    },
    [threadId],
  );

  const editPost = useCallback(
    (postId: string, body: string) => {
      if (threadId === undefined) return;
      boardStore.editPost(threadId, postId, body);
      void boardActions.editPost(postId, { body }).then((result) => {
        if (!result.ok) console.warn("[board] edit not saved", result.error);
      });
    },
    [threadId],
  );

  const deletePost = useCallback(
    (postId: string) => {
      if (threadId === undefined) return;
      boardStore.deletePost(threadId, postId);
      void boardActions.deletePost(postId).then((result) => {
        if (!result.ok) console.warn("[board] delete not saved", result.error);
      });
    },
    [threadId],
  );

  // Server-first: the action commits the reply (the id is real) before the
  // store renders it. Callers notify mentions under the returned id, so a
  // failed write notifies nothing.
  const addReply = useCallback(
    async (
      body: string,
      author: BoardMember,
      replyTo?: string,
    ): Promise<ThreadPost | undefined> => {
      if (threadId === undefined) return undefined;
      const result = await boardActions.replyToThread(threadId, {
        body,
        ...(replyTo === undefined ? {} : { replyTo }),
      });
      if (!result.ok) {
        console.warn("[board] reply not saved", result.error);
        return undefined;
      }
      const post: ThreadPost = {
        id: result.id,
        author,
        body,
        ...(replyTo === undefined ? {} : { replyTo }),
        createdAt: result.createdAt ?? new Date().toISOString(),
        votes: 0,
      };
      boardStore.addConfirmedPost(threadId, post);
      return post;
    },
    [threadId],
  );

  // Composed threads commit server-side and return the action outcome: the
  // caller navigates to the new thread's route from the returned id.
  const composeThread = useCallback((input: ComposeInput) => boardActions.composeThread(input), []);

  // The open thread's pin/lock as the session sees them: the fixture flags
  // with the admin overrides merged in. The toggles flip the effective flag;
  // rights are gated where the actions are bound (the thread providers).
  const openSummary =
    threadId === undefined ? undefined : withFlags.find((entry) => entry.id === threadId);
  const pinned = openSummary?.pinned ?? false;
  const locked = openSummary?.locked ?? false;

  const togglePin = useCallback(() => {
    if (threadId === undefined) return;
    const snapshot = boardStore.boardSnapshot();
    const current =
      boardStore.threadFlagOf(snapshot, threadId, "pinned") ?? openSummary?.pinned ?? false;
    boardStore.setThreadFlag(threadId, "pinned", !current);
  }, [openSummary, threadId]);

  const toggleLock = useCallback(() => {
    if (threadId === undefined) return;
    const snapshot = boardStore.boardSnapshot();
    const current =
      boardStore.threadFlagOf(snapshot, threadId, "locked") ?? openSummary?.locked ?? false;
    boardStore.setThreadFlag(threadId, "locked", !current);
  }, [openSummary, threadId]);

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
    pinned,
    locked,
    toggleThreadVote,
    togglePostVote,
    editPost,
    deletePost,
    togglePin,
    toggleLock,
    addReply,
    composeThread,
  };
}
