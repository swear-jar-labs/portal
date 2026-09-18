"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ThreadState } from "./board-store";

// The open thread's actions: BoardStack owns the mock state (the island), the
// thread layer consumes it from here — the layer arrives as an RSC slot, so
// props cannot carry the handlers.
export type ThreadActions = {
  state: ThreadState;
  votedThread: boolean;
  onToggleThreadVote: () => void;
  onTogglePostVote: (postId: string) => void;
  onEditPost: (postId: string, body: string) => void;
  onDeletePost: (postId: string) => void;
  onReply: (body: string) => void;
};

const ThreadActionsContext = createContext<ThreadActions | null>(null);

export type ThreadActionsProviderProps = {
  actions: ThreadActions | null;
  children: ReactNode;
};

export function ThreadActionsProvider({ actions, children }: ThreadActionsProviderProps) {
  return <ThreadActionsContext.Provider value={actions}>{children}</ThreadActionsContext.Provider>;
}

export function useThreadActions(): ThreadActions {
  const actions = useContext(ThreadActionsContext);
  if (actions === null) throw new Error("useThreadActions must render inside an open thread");
  return actions;
}
