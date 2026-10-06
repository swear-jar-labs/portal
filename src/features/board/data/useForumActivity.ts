"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  boardServerSnapshot,
  boardSnapshot,
  subscribeBoard,
  withLocalActivity,
} from "./board-store";
import { forumActivityCounts, type ForumActivitySeed } from "./forum-activity";
import type { ThreadSummary } from "../model/threads";

export function useForumActivity(
  user: string,
  seed: ForumActivitySeed,
  fixtureThreads: readonly ThreadSummary[],
) {
  const state = useSyncExternalStore(subscribeBoard, boardSnapshot, boardServerSnapshot);
  // Server post ids echoed by the seed, keyed by thread: the card merge
  // drops confirmed replies the revalidated profile already includes, so a
  // reply is never counted twice (same whole-session hazard as the counts
  // filter in forumActivityCounts).
  const serverPostIds = useMemo(() => {
    const echoed = new Map<string, Set<string>>();
    for (const { threadId, postId } of seed.replies) {
      const ids = echoed.get(threadId) ?? new Set<string>();
      ids.add(postId);
      echoed.set(threadId, ids);
    }
    return echoed;
  }, [seed.replies]);
  return {
    ...forumActivityCounts(user, seed, state),
    // Composed threads commit server-side now (their authors arrive through
    // the seed), so the session tracks none. The field stays — the
    // profile's forum section reads .length/.slice off it, and that slice
    // is out of scope for this task.
    localThreads: [] as { id: string; title: string }[],
    threads: withLocalActivity(fixtureThreads, state.threads, serverPostIds),
  };
}
