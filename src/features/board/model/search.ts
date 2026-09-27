// The forum's mock search: pure matching over thread titles and every reply
// body (code fences included, attachments and outside links never indexed).
// The caller feeds it the already-visible, session-merged threads — hidden,
// deleted and unavailable posts are removed before matching, so they never
// reach the count or the fragments. Phase 5 replaces the matcher with a
// server FTS; the UI keeps the flat post rows and the URL contract (?q=).

// How many words of a query take part: past the cap the tail is ignored, so
// a pasted paragraph cannot turn the matcher quadratic.
export const MAX_SEARCH_TERMS = 10;
// How many post rows one thread contributes: the total stays on the counter,
// the rest stays reachable through the open thread.
export const MAX_VISIBLE_MATCHES_PER_THREAD = 3;
// The fragment window around the earliest term hit.
export const SEARCH_FRAGMENT_RADIUS = 60;
export const SEARCH_FRAGMENT_MAX_LENGTH = 160;

import type { BoardRoleId } from "./threads";

const WHITESPACE_PATTERN = /\s+/;
const ELLIPSIS = "…";

export type SearchablePost = {
  id: string;
  body: string;
  createdAt: string;
  // Carried through to the result row when the caller knows them; matching
  // never depends on them.
  author?: string;
  role?: BoardRoleId;
};

export type SearchableThread = {
  id: string;
  title: string;
  createdAt: string;
  posts: readonly SearchablePost[];
};

/** The query in matcher form: lowercased AND-terms, at most MAX_SEARCH_TERMS. */
export function splitSearchTerms(query: string): string[] {
  const terms = query
    .toLowerCase()
    .split(WHITESPACE_PATTERN)
    .filter((term) => term.length > 0);
  return [...new Set(terms)].slice(0, MAX_SEARCH_TERMS);
}

/** A blank query (empty or whitespace) means the plain feed, not a search. */
export function isBlankSearch(query: string): boolean {
  return splitSearchTerms(query).length === 0;
}

export type TermRange = { start: number; end: number };

/** Every non-overlapping occurrence of every term in the lowercased haystack. */
export function findTermRanges(lowerHaystack: string, terms: readonly string[]): TermRange[] {
  const ranges: TermRange[] = [];
  for (const term of terms) {
    let from = 0;
    for (;;) {
      const start = lowerHaystack.indexOf(term, from);
      if (start === -1) break;
      ranges.push({ start, end: start + term.length });
      from = start + term.length;
    }
  }
  return ranges.sort((a, b) => a.start - b.start || a.end - b.end);
}

/** AND-matching: every term occurs at least once. */
export function matchesAllTerms(lowerHaystack: string, terms: readonly string[]): boolean {
  return terms.every((term) => lowerHaystack.includes(term));
}

/** Overlapping term hits (one term inside another) merge into a single
 * highlight: otherwise the segments would repeat the shared text. Ranges
 * arrive sorted from findTermRanges. */
export function mergeTermRanges(ranges: readonly TermRange[]): TermRange[] {
  const merged: TermRange[] = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last === undefined || range.start > last.end) merged.push({ ...range });
    else last.end = Math.max(last.end, range.end);
  }
  return merged;
}

export type FragmentSegment = { text: string; hit: boolean };

export type SearchFragment = {
  text: string;
  segments: FragmentSegment[];
  truncatedBefore: boolean;
  truncatedAfter: boolean;
};

/** A readable window around the earliest hit with the in-window hits marked.
 * The text is sliced, never HTML-parsed: rendering maps segments to text
 * nodes, so a query or a body can never inject markup. Indices run on the
 * lowercased copy and slice the original at the same offsets (the mock
 * corpus is ASCII; the server FTS owns real Unicode later). */
export function buildSearchFragment(body: string, ranges: readonly TermRange[]): SearchFragment {
  const merged = mergeTermRanges(ranges);
  const first = merged[0];
  if (first === undefined) {
    const text =
      body.length <= SEARCH_FRAGMENT_MAX_LENGTH
        ? body
        : `${body.slice(0, SEARCH_FRAGMENT_MAX_LENGTH - 1).trimEnd()}${ELLIPSIS}`;
    return {
      text,
      segments: [{ text, hit: false }],
      truncatedBefore: false,
      truncatedAfter: body.length > SEARCH_FRAGMENT_MAX_LENGTH,
    };
  }
  const start = Math.max(0, first.start - SEARCH_FRAGMENT_RADIUS);
  let end = Math.min(body.length, first.end + SEARCH_FRAGMENT_RADIUS);
  if (end - start > SEARCH_FRAGMENT_MAX_LENGTH) end = start + SEARCH_FRAGMENT_MAX_LENGTH;
  const inWindow = merged.filter((range) => range.start >= start && range.end <= end);
  const segments: FragmentSegment[] = [];
  let cursor = start;
  for (const range of inWindow) {
    if (range.start > cursor) segments.push({ text: body.slice(cursor, range.start), hit: false });
    segments.push({ text: body.slice(range.start, range.end), hit: true });
    cursor = range.end;
  }
  if (cursor < end) segments.push({ text: body.slice(cursor, end), hit: false });
  const truncatedBefore = start > 0;
  const truncatedAfter = end < body.length;
  const text = `${truncatedBefore ? ELLIPSIS : ""}${body.slice(start, end)}${truncatedAfter ? ELLIPSIS : ""}`;
  return { text, segments, truncatedBefore, truncatedAfter };
}

export type PostSearchHit = {
  // Undefined for a title hit: the jump opens the thread at its head.
  postId: string | undefined;
  // The reply's author and role for the result row; absent on title hits.
  author?: string;
  role?: BoardRoleId;
  createdAt: string;
  fragment: SearchFragment;
  matchCount: number;
};

export type ThreadSearchHit = {
  threadId: string;
  // Title first, then posts in thread order; the panel shows the first
  // MAX_VISIBLE_MATCHES_PER_THREAD, the thread itself holds the rest.
  matches: PostSearchHit[];
  totalMatches: number;
};

/** One thread's hits for the given terms: the title, then every matching
 * post in thread order. Empty when nothing holds all terms. */
export function matchSearchThread(
  thread: SearchableThread,
  terms: readonly string[],
): ThreadSearchHit | null {
  if (terms.length === 0) return null;
  const matches: PostSearchHit[] = [];
  const lowerTitle = thread.title.toLowerCase();
  if (matchesAllTerms(lowerTitle, terms)) {
    const ranges = findTermRanges(lowerTitle, terms);
    matches.push({
      postId: undefined,
      fragment: buildSearchFragment(thread.title, ranges),
      createdAt: thread.createdAt,
      matchCount: ranges.length,
    });
  }
  for (const post of thread.posts) {
    const lowerBody = post.body.toLowerCase();
    if (!matchesAllTerms(lowerBody, terms)) continue;
    const ranges = findTermRanges(lowerBody, terms);
    matches.push({
      postId: post.id,
      ...(post.author === undefined ? {} : { author: post.author }),
      ...(post.role === undefined ? {} : { role: post.role }),
      createdAt: post.createdAt,
      fragment: buildSearchFragment(post.body, ranges),
      matchCount: ranges.length,
    });
  }
  if (matches.length === 0) return null;
  return {
    threadId: thread.id,
    matches: matches.slice(0, MAX_VISIBLE_MATCHES_PER_THREAD),
    totalMatches: matches.length,
  };
}

/** The mock search over visible, session-merged threads: AND-terms per title
 * or per post, one grouped hit per thread. Ordering stays the feed's own
 * (the caller ranks the hit ids with rankThreads under the current sort),
 * so the sort controls keep working under a query. */
export function searchThreads(
  threads: readonly SearchableThread[],
  query: string,
): ThreadSearchHit[] {
  const terms = splitSearchTerms(query);
  if (terms.length === 0) return [];
  const hits: ThreadSearchHit[] = [];
  for (const thread of threads) {
    const hit = matchSearchThread(thread, terms);
    if (hit !== null) hits.push(hit);
  }
  return hits;
}
