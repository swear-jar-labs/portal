"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Readroom } from "./readrooms";
import {
  readroomServerSnapshot,
  readroomSnapshot,
  subscribeReadroom,
  withSession,
  type ReadroomState,
} from "./readroom-store";

/** The session snapshot: components overlay it on the base fixtures themselves
 * (the stack for the feed, the task view for its task). */
export function useReadroomStore(): ReadroomState {
  return useSyncExternalStore(subscribeReadroom, readroomSnapshot, readroomServerSnapshot);
}

/** The stack's data layer: the session's composed tasks and the fixtures,
 * each overlaid with the session's facts. */
export function useReadroomSession(readrooms: readonly Readroom[]) {
  const state = useReadroomStore();
  const visible = useMemo(
    () => withSession([...state.addedReadrooms, ...readrooms], state),
    [readrooms, state],
  );
  return { state, readrooms: visible };
}
