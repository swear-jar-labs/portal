"use client";

import { useSyncExternalStore } from "react";
import {
  boardServerSnapshot,
  boardSnapshot,
  subscribeBoard,
  withLocalActivity,
} from "./board-store";
import { forumActivityCounts, localForumThreads, type ForumActivitySeed } from "./forum-activity";
import type { ThreadSummary } from "../model/threads";

export function useForumActivity(
  user: string,
  seed: ForumActivitySeed,
  fixtureThreads: readonly ThreadSummary[],
) {
  const state = useSyncExternalStore(subscribeBoard, boardSnapshot, boardServerSnapshot);
  return {
    ...forumActivityCounts(user, seed, state),
    localThreads: localForumThreads(user, state),
    threads: withLocalActivity(fixtureThreads, state.threads),
  };
}
