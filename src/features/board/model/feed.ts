import { BOARD_QUERY_PARAM } from "@/lib/board";
import { boardIds, isBoardId, isTagId, type BoardId, type TagId } from "./threads";

export const threadSorts = ["hot", "new"] as const;
export type ThreadSort = (typeof threadSorts)[number];

// What the feed can show: an unfiltered board, one board, one tag, or both.
export type FeedFilters = {
  board?: BoardId;
  tag?: TagId;
};

export type FeedQuery = FeedFilters & {
  sort: ThreadSort;
};

export const DEFAULT_FEED_QUERY: FeedQuery = { sort: "hot" };

const TAG_PARAM = "tag";
const SORT_PARAM = "sort";

function isThreadSort(value: string): value is ThreadSort {
  return threadSorts.some((sort) => sort === value);
}

/** Reads the feed state out of the URL; unknown values fall back to defaults. */
export function parseFeedQuery(
  params: URLSearchParams,
  allowedBoards: readonly BoardId[] = boardIds,
): FeedQuery {
  const board = params.get(BOARD_QUERY_PARAM);
  const tag = params.get(TAG_PARAM);
  const sort = params.get(SORT_PARAM);
  return {
    ...(board && (isBoardId(board) || allowedBoards.includes(board)) ? { board } : {}),
    ...(tag && isTagId(tag) ? { tag } : {}),
    sort: sort && isThreadSort(sort) ? sort : DEFAULT_FEED_QUERY.sort,
  };
}

/** Structural equality for feed queries: the URL sync resets only on change. */
export function sameFeedQuery(a: FeedQuery, b: FeedQuery): boolean {
  return a.board === b.board && a.tag === b.tag && a.sort === b.sort;
}

/** The URL form of the feed state: defaults stay out, so the feed links clean. */
export function feedQueryParams(query: FeedQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.board) params.set(BOARD_QUERY_PARAM, query.board);
  if (query.tag) params.set(TAG_PARAM, query.tag);
  if (query.sort !== DEFAULT_FEED_QUERY.sort) params.set(SORT_PARAM, query.sort);
  return params;
}

export type RankableThread = {
  id: string;
  board: BoardId;
  tags: readonly TagId[];
  pinned: boolean;
  votes: number;
  replies: number;
  createdAt: string;
  lastActivityAt: string;
};

const HOUR_MS = 3_600_000;

// Hotness: votes weigh double, replies count once, one raw point keeps a fresh
// thread visible, and the age (in hours, last activity) damps it down.
const SCORE_VOTE_WEIGHT = 2;
const SCORE_AGE_OFFSET_HOURS = 2;

function hotScore(thread: RankableThread, now: number): number {
  const ageHours = Math.max(0, now - Date.parse(thread.lastActivityAt)) / HOUR_MS;
  return (
    (SCORE_VOTE_WEIGHT * thread.votes + thread.replies + 1) / (ageHours + SCORE_AGE_OFFSET_HOURS)
  );
}

function byId(a: RankableThread, b: RankableThread): number {
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

// Freshest activity first: the card shows last activity, so the order matches
// the visible key.
function byNewest(a: RankableThread, b: RankableThread): number {
  const age = Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt);
  return age !== 0 ? age : byId(a, b);
}

function byHotter(now: number) {
  return (a: RankableThread, b: RankableThread): number => {
    const score = hotScore(b, now) - hotScore(a, now);
    return score !== 0 ? score : byNewest(a, b);
  };
}

export function filterThreads<T extends RankableThread>(
  threads: readonly T[],
  filters: FeedFilters,
): T[] {
  return threads.filter(
    (thread) =>
      (filters.board === undefined || thread.board === filters.board) &&
      (filters.tag === undefined || thread.tags.includes(filters.tag)),
  );
}

/** Pinned threads stay on top under both sorts; `now` is a parameter so the
 * ranking is pure and testable (the RSC captures it once per render). */
export function rankThreads<T extends RankableThread>(
  threads: readonly T[],
  sort: ThreadSort,
  now: number,
): T[] {
  const compare = sort === "hot" ? byHotter(now) : byNewest;
  return [...threads].sort((a, b) => Number(b.pinned) - Number(a.pinned) || compare(a, b));
}
