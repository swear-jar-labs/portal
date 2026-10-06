import { FEED_PATH, threadPath } from "../model/threads";

// Slice-owned invalidation identity (backend-board; the epic's named-tag
// rule): one plan per mutation kind, as a Record (never a conditional).
// Deliberately paths-only: tag invalidation (updateTag) is a no-op without
// cacheTag subscribers, and the reads are plain async functions — they run
// in unit tests outside the Next runtime, where cached reads cannot live.
// Revisit with tag names when the reads become 'use cache' functions.
export const BOARD_MUTATION_KINDS = [
  "compose",
  "reply",
  "edit-post",
  "delete-post",
  "vote",
] as const;

export type BoardMutationKind = (typeof BOARD_MUTATION_KINDS)[number];

// Server action outcomes: the guest gate reads login-required (the client
// raises the login prompt, like its own gate), author violations read
// forbidden, seed gaps read unavailable.
export const BOARD_ACTION_ERRORS = [
  "login-required",
  "invalid",
  "forbidden",
  "missing",
  "unavailable",
] as const;

export type BoardActionError = (typeof BOARD_ACTION_ERRORS)[number];

export type BoardActionResult =
  { ok: true; id: string; createdAt?: string } | { ok: false; error: BoardActionError };

export type BoardInvalidationTarget = { threadId: string };

export type BoardInvalidationPlan = {
  // Page paths revalidate their segment; the layout root heals the shell
  // chrome that reads the board (the jar counter in the root layout).
  // Separate lists, so the wrapper applies them without dispatch.
  paths: string[];
  layoutPaths: string[];
};

const LAYOUT_ROOT_PATH = "/";

// One plan shape for every mutation: the feed (ranking and counts move on
// any write) plus the written thread. A composed thread names its new
// route the same way — it resolves immediately after the action commits.
function feedInvalidation(threadId: string): BoardInvalidationPlan {
  return {
    paths: [FEED_PATH, threadPath(threadId)],
    layoutPaths: [LAYOUT_ROOT_PATH],
  };
}

// Entity → paths, as a Record (never a conditional): adding a mutation
// kind without an entry fails the typecheck, shipping one without paths
// fails the completeness test.
export const BOARD_INVALIDATION: Record<
  BoardMutationKind,
  (target: BoardInvalidationTarget) => BoardInvalidationPlan
> = {
  compose: ({ threadId }) => feedInvalidation(threadId),
  reply: ({ threadId }) => feedInvalidation(threadId),
  "edit-post": ({ threadId }) => feedInvalidation(threadId),
  "delete-post": ({ threadId }) => feedInvalidation(threadId),
  vote: ({ threadId }) => feedInvalidation(threadId),
};
