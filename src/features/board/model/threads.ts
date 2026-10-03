// The board's model: types, taxonomy, the URL canon and the pure helpers the
// board files share. Fixtures and getters live in ../data/queries; the contract manifest
// (contracts/index.ts) re-exports what other features consume.

import type { Tone } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { techIds, type TechId } from "@/content/techs";
import {
  archivedProjectSlugs,
  isKnownProjectSlug,
  projectName,
  projectSlugs,
} from "@/features/projects/contracts";
import { ERRATA_BOARD_ID } from "@/lib/board";
import { formatAge as formatRelativeAge } from "@/shared/age";

// Boards: the general one, errata (its own vocabulary, same machinery),
// ideas (a project's seed, pre-proposal) and interviews (prep: mock
// questions and answer reviews, no job offers) plus the project journals
// (names come from the projects slice; Phase 5 reads them from
// sections.title). Tutorials stay out until guides accumulate in GENERAL.
export const staticBoardIds = ["general", ERRATA_BOARD_ID, "ideas", "interviews"] as const;
type StaticBoardId = (typeof staticBoardIds)[number];

export const boardIds = [...staticBoardIds, ...projectSlugs] as const;
export type BoardId = string;
export type BoardOption = { id: BoardId; name: string; archived: boolean };

// Archived journals stay readable but closed: the feed filters the full
// taxonomy, the composer offers everything else.
const archivedBoards: ReadonlySet<string> = new Set(archivedProjectSlugs);

export const composableBoardIds = boardIds.filter((id) => !archivedBoards.has(id));

/** The board's display name: chrome labels for the static boards, the project
 * registry's name for the journals (fixture and runtime-approved alike). */
export function boardTitle(id: BoardId): string {
  if (isKnownProjectSlug(id)) return projectName(id);
  if (isStaticBoardId(id)) return messages.board.boards[id];
  return id;
}

function isStaticBoardId(value: string): value is StaticBoardId {
  return staticBoardIds.some((id) => id === value);
}

// Tags are the board's status vocabulary: proposal and question carry a tone
// and read as chips (decision was cut 2026-09-28: announcements read without
// a status). Topical tags (compilers, tooling, craft, meta) were cut
// 2026-09-27: the board speaks in thread kinds, topics live in titles and
// bodies (and the search finds them there). Technologies ride the readroom's
// shared vocabulary instead (ThreadTechId below).
export const tagIds = ["proposal", "question"] as const;
export type TagId = (typeof tagIds)[number];

export const tagTones: Partial<Record<TagId, Tone>> = {
  proposal: "cyan",
  question: "brown",
};

export function isBoardId(value: string): value is BoardId {
  return boardIds.some((id) => id === value);
}

export function isTagId(value: string): value is TagId {
  return tagIds.some((id) => id === value);
}

// Technologies share the readroom's vocabulary whole (one list for the forum,
// the readroom and the project stacks): a thread carries status tags (what
// kind of thread it is) plus techs (what it is about). Both filters are
// multi-select AND, like the readroom's tag filter.
export const threadTechIds = techIds;
export type ThreadTechId = TechId;

export function isThreadTechId(value: string): value is ThreadTechId {
  return threadTechIds.some((id) => id === value);
}

// The board's URL canon: the feed and the profile build thread links from it.
export const FEED_PATH = "/forum";
export const threadPath = (id: string) => `${FEED_PATH}/${id}`;

// The thread's browser tab title: the direct page's metadata and the overlay
// store (soft navigation skips the slot's metadata) share one string.
export function threadDocumentTitle(thread: { title: string }): string {
  return `${thread.title} — ${messages.metadata.title}`;
}

export type BoardRoleId = "member" | "contributor" | "maintainer";

export type BoardMember = {
  user: string;
  role: BoardRoleId;
  avatar?: string;
};

export type ThreadPost = {
  id: string;
  author: BoardMember;
  body: string;
  // The post this one answers: the list stays flat, the marker carries the
  // context. Phase 5 maps it to posts.reply_to_id.
  replyTo?: string;
  createdAt: string;
  votes: number;
};

export type Thread = {
  id: string;
  board: BoardId;
  title: string;
  author: BoardMember;
  tags: readonly TagId[];
  techs: readonly ThreadTechId[];
  pinned: boolean;
  locked: boolean;
  createdAt: string;
  votes: number;
  posts: readonly ThreadPost[];
};

// What lists render: the thread without its posts, with the counters and the
// last activity derived from them.
export type ThreadSummary = Omit<Thread, "posts"> & {
  replies: number;
  lastActivityAt: string;
};

/** The thread without its posts: what lists render. The UI-first board also
 * derives its locally composed threads through it. */
export function summarizeThread(thread: Thread): ThreadSummary {
  const { posts, ...summary } = thread;
  return {
    ...summary,
    replies: Math.max(0, posts.length - 1),
    // The board feeds on activity: the last post or, for a thread without one,
    // its creation.
    lastActivityAt: posts.at(-1)?.createdAt ?? thread.createdAt,
  };
}

/** Compact relative age: `5M AGO`, `3H AGO`, `2D AGO`, `JUST NOW`. */
export function formatAge(iso: string, nowIso: string): string {
  return formatRelativeAge(iso, nowIso, messages.board.age);
}

/** Errata threads created inside the jar window (fixtures and session-composed
 * alike): the shell's jar dialog reads the board through it, never the store. */
export function countRecentErrata(
  summaries: readonly ThreadSummary[],
  now: number,
  windowMs: number,
): number {
  return summaries.filter(
    (summary) =>
      summary.board === ERRATA_BOARD_ID && now - Date.parse(summary.createdAt) < windowMs,
  ).length;
}
