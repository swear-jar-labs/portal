import { BOARD_QUERY_PARAM } from "@/lib/board";
import {
  boardIds,
  isBoardId,
  isTagId,
  isThreadTechId,
  type BoardId,
  type TagId,
  type ThreadTechId,
} from "./threads";

export const threadSorts = ["hot", "new"] as const;
export type ThreadSort = (typeof threadSorts)[number];

// What the feed can show: an unfiltered board, one board, any number of
// status tags and techs (both AND, like the readroom's tag filter) — or their
// combination.
export type FeedFilters = {
  board?: BoardId;
  tags?: readonly TagId[];
  techs?: readonly ThreadTechId[];
};

export type FeedQuery = FeedFilters & {
  sort: ThreadSort;
  // The forum search: raw input, kept verbatim in the URL. Blank
  // (empty/whitespace) means the plain feed; matching normalizes it.
  q: string;
};

export const DEFAULT_FEED_QUERY: FeedQuery = { sort: "hot", q: "" };

const TAG_PARAM = "tag";
const TECH_PARAM = "tech";
const SORT_PARAM = "sort";
const SEARCH_QUERY_PARAM = "q";

function isThreadSort(value: string): value is ThreadSort {
  return threadSorts.some((sort) => sort === value);
}

/** Reads the feed state out of the URL; unknown values fall back to defaults. */
export function parseFeedQuery(
  params: URLSearchParams,
  allowedBoards: readonly BoardId[] = boardIds,
): FeedQuery {
  const board = params.get(BOARD_QUERY_PARAM);
  const tags = params.getAll(TAG_PARAM).filter((tag): tag is TagId => isTagId(tag));
  const techs = params
    .getAll(TECH_PARAM)
    .filter((tech): tech is ThreadTechId => isThreadTechId(tech));
  const sort = params.get(SORT_PARAM);
  const q = params.get(SEARCH_QUERY_PARAM);
  return {
    ...(board && (isBoardId(board) || allowedBoards.includes(board)) ? { board } : {}),
    ...(tags.length > 0 ? { tags: [...new Set(tags)] } : {}),
    ...(techs.length > 0 ? { techs: [...new Set(techs)] } : {}),
    sort: sort && isThreadSort(sort) ? sort : DEFAULT_FEED_QUERY.sort,
    q: q ?? DEFAULT_FEED_QUERY.q,
  };
}

/** Structural equality for feed queries: the URL sync resets only on change. */
export function sameFeedQuery(a: FeedQuery, b: FeedQuery): boolean {
  return (
    a.board === b.board &&
    (a.tags ?? []).join() === (b.tags ?? []).join() &&
    (a.techs ?? []).join() === (b.techs ?? []).join() &&
    a.sort === b.sort &&
    a.q === b.q
  );
}

/** The URL form of the feed state: defaults stay out, so the feed links clean. */
export function feedQueryParams(query: FeedQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.board) params.set(BOARD_QUERY_PARAM, query.board);
  for (const tag of query.tags ?? []) params.append(TAG_PARAM, tag);
  for (const tech of query.techs ?? []) params.append(TECH_PARAM, tech);
  if (query.sort !== DEFAULT_FEED_QUERY.sort) params.set(SORT_PARAM, query.sort);
  if (query.q !== DEFAULT_FEED_QUERY.q) params.set(SEARCH_QUERY_PARAM, query.q);
  return params;
}

export type RankableThread = {
  id: string;
  board: BoardId;
  tags: readonly TagId[];
  techs: readonly ThreadTechId[];
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
      (filters.tags ?? []).every((tag) => thread.tags.includes(tag)) &&
      (filters.techs ?? []).every((tech) => thread.techs.includes(tech)),
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
