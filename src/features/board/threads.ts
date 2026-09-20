// The board's model: types, taxonomy, the URL canon and the pure helpers the
// board files share. Fixtures and getters live in ./data; the contract manifest
// (contracts/index.ts) re-exports what other features consume.

import type { Tone } from "@swearjar/dos";
import { messages } from "@/content/messages";
import {
  archivedProjectSlugs,
  isProjectSlug,
  projectName,
  projectSlugs,
} from "@/features/projects/contracts";
import { formatAge as formatRelativeAge } from "@/shared/age";

// Boards: the general one, errata (its own vocabulary, same machinery) and
// the project journals (names come from the projects slice; Phase 5 reads
// them from sections.title).
export const staticBoardIds = ["general", "errata"] as const;
export type StaticBoardId = (typeof staticBoardIds)[number];

export const boardIds = [...staticBoardIds, ...projectSlugs] as const;
export type BoardId = (typeof boardIds)[number];

// Archived journals stay readable but closed: the feed filters the full
// taxonomy, the composer offers everything else.
const archivedBoards: ReadonlySet<string> = new Set(archivedProjectSlugs);

export const composableBoardIds = boardIds.filter((id) => !archivedBoards.has(id));

/** The board's display name: chrome labels for the static boards, the project
 * registry's name for the journals. */
export function boardTitle(id: BoardId): string {
  if (isProjectSlug(id)) return projectName(id);
  return messages.board.boards[id];
}

// Tags are the board's vocabulary: status tags carry a tone and read as chips,
// topical tags stay neutral.
export const tagIds = [
  "proposal",
  "decision",
  "question",
  "compilers",
  "tooling",
  "craft",
  "meta",
] as const;
export type TagId = (typeof tagIds)[number];

export const tagTones: Partial<Record<TagId, Tone>> = {
  proposal: "cyan",
  decision: "green",
  question: "yellow",
};

export function isBoardId(value: string): value is BoardId {
  return boardIds.some((id) => id === value);
}

export function isTagId(value: string): value is TagId {
  return tagIds.some((id) => id === value);
}

// The board's URL canon: the feed and the profile build thread links from it.
export const FEED_PATH = "/discussions";
export const threadPath = (id: string) => `${FEED_PATH}/${id}`;

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
