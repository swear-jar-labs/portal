import { readroomTagIds, type Readroom, type ReadroomMode, type ReadroomTagId } from "./readrooms";

const QUERY_PARAM = "q";
const MODE_PARAM = "mode";
const TAG_PARAM = "tag";
const MAX_TERMS = 10;
const FRAGMENT_RADIUS = 60;
const FRAGMENT_LENGTH = 160;

export type ReadroomQuery = { q: string; mode: ReadroomMode; tags: readonly ReadroomTagId[] };
const DEFAULT_READROOM_QUERY: ReadroomQuery = { q: "", mode: "top", tags: [] };

export function parseReadroomQuery(params: URLSearchParams): ReadroomQuery {
  const mode = params.get(MODE_PARAM);
  const tags = params
    .getAll(TAG_PARAM)
    .filter((tag): tag is ReadroomTagId => readroomTagIds.some((id) => id === tag));
  return {
    q: params.get(QUERY_PARAM) ?? DEFAULT_READROOM_QUERY.q,
    mode: mode === "new" || mode === "active" ? mode : DEFAULT_READROOM_QUERY.mode,
    tags: [...new Set(tags)],
  };
}

export function readroomQueryParams(query: ReadroomQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set(QUERY_PARAM, query.q);
  if (query.mode !== DEFAULT_READROOM_QUERY.mode) params.set(MODE_PARAM, query.mode);
  for (const tag of query.tags) params.append(TAG_PARAM, tag);
  return params;
}

export function sameReadroomQuery(a: ReadroomQuery, b: ReadroomQuery): boolean {
  return a.q === b.q && a.mode === b.mode && a.tags.join() === b.tags.join();
}

export function searchTerms(query: string): string[] {
  return [...new Set(query.toLowerCase().trim().split(/\s+/).filter(Boolean))].slice(0, MAX_TERMS);
}

export type SearchFragment = { segments: { text: string; hit: boolean }[] };

const HIGH_SURROGATE_MIN = 0xd800;
const HIGH_SURROGATE_MAX = 0xdbff;
const LOW_SURROGATE_MIN = 0xdc00;
const LOW_SURROGATE_MAX = 0xdfff;

/** The fragment window is cut by UTF-16 offsets and can land inside a
 * surrogate pair. Snap the boundary out so a fragment never holds half a
 * code point (the match ranges themselves already sit on boundaries). */
function snapFragmentBoundary(body: string, index: number, direction: -1 | 1): number {
  const splitsPair =
    index > 0 &&
    index < body.length &&
    body.charCodeAt(index) >= LOW_SURROGATE_MIN &&
    body.charCodeAt(index) <= LOW_SURROGATE_MAX &&
    body.charCodeAt(index - 1) >= HIGH_SURROGATE_MIN &&
    body.charCodeAt(index - 1) <= HIGH_SURROGATE_MAX;
  return splitsPair ? index + direction : index;
}

/** UTF-16 offsets in a lowercase copy can differ from the source (İ → i̇).
 * Map each folded code unit back to the whole source code point so a match
 * always slices and highlights the original text on code point boundaries. */
function originalOffsets(body: string): { starts: number[]; ends: number[] } {
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;
  for (const point of body) {
    const end = offset + point.length;
    for (let index = 0; index < point.toLowerCase().length; index += 1) {
      starts.push(offset);
      ends.push(end);
    }
    offset = end;
  }
  return { starts, ends };
}

export function searchFragment(body: string, terms: readonly string[]): SearchFragment | null {
  const lower = body.toLowerCase();
  if (terms.length === 0 || !terms.every((term) => lower.includes(term))) return null;
  const offsets = originalOffsets(body);
  const ranges: { start: number; end: number }[] = [];
  for (const term of terms) {
    let from = 0;
    for (;;) {
      const start = lower.indexOf(term, from);
      if (start < 0) break;
      const originalStart = offsets.starts[start];
      const originalEnd = offsets.ends[start + term.length - 1];
      if (originalStart !== undefined && originalEnd !== undefined)
        ranges.push({ start: originalStart, end: originalEnd });
      from = start + term.length;
    }
  }
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: typeof ranges = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (!previous || range.start > previous.end) merged.push({ ...range });
    else previous.end = Math.max(previous.end, range.end);
  }
  const first = merged[0];
  if (first === undefined) return null;
  const rawStart = Math.max(0, first.start - FRAGMENT_RADIUS);
  const rawEnd = Math.min(body.length, Math.max(rawStart + FRAGMENT_LENGTH, first.end));
  const start = snapFragmentBoundary(body, rawStart, -1);
  const end = snapFragmentBoundary(body, rawEnd, 1);
  const segments: SearchFragment["segments"] = [];
  if (start > 0) segments.push({ text: "…", hit: false });
  let cursor = start;
  for (const range of merged) {
    if (range.end <= cursor || range.start >= end) continue;
    const rangeStart = Math.max(cursor, range.start);
    if (rangeStart > cursor) segments.push({ text: body.slice(cursor, rangeStart), hit: false });
    const rangeEnd = Math.min(end, range.end);
    segments.push({ text: body.slice(rangeStart, rangeEnd), hit: true });
    cursor = rangeEnd;
  }
  if (cursor < end) segments.push({ text: body.slice(cursor, end), hit: false });
  if (end < body.length) segments.push({ text: "…", hit: false });
  return { segments };
}

export type ReadroomHit = {
  taskId: string;
  kind: "title" | "description" | "note" | "report";
  noteId?: string;
  author?: string;
  fragment: SearchFragment;
};

export type SearchVisibility = {
  hiddenNoteIds: ReadonlySet<string>;
  revisionBodies: ReadonlyMap<string, string>;
};

/** The caller supplies the effective session task and moderation visibility.
 * Notes enter the corpus only at the deadline, regardless of viewer or phase.
 * AND terms must occur in one field; each field produces a navigable hit. */
export function searchReadrooms(
  readrooms: readonly Readroom[],
  query: string,
  now: string,
  visibility: SearchVisibility,
): ReadroomHit[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return [];
  const hits: ReadroomHit[] = [];
  for (const task of readrooms) {
    const add = (kind: ReadroomHit["kind"], body: string, noteId?: string, author?: string) => {
      const fragment = searchFragment(body, terms);
      if (fragment)
        hits.push({
          taskId: task.id,
          kind,
          fragment,
          ...(noteId ? { noteId } : {}),
          ...(author ? { author } : {}),
        });
    };
    add("title", task.title);
    add("description", task.description);
    if (Date.parse(now) >= Date.parse(task.deadlineAt)) {
      for (const note of task.notes) {
        if (visibility.hiddenNoteIds.has(note.id)) continue;
        add("note", visibility.revisionBodies.get(note.id) ?? note.body, note.id, note.author.user);
      }
    }
    if (task.report !== undefined) add("report", task.report);
  }
  return hits;
}

export function filterReadroomTags(
  readrooms: readonly Readroom[],
  tags: readonly ReadroomTagId[],
): Readroom[] {
  return readrooms.filter((task) => tags.every((tag) => task.tags.includes(tag)));
}
