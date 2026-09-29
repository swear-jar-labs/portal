"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ThreadState } from "./board-store";

// The open thread's actions: BoardStack owns the mock state (the island), the
// thread layer consumes it from here — the layer arrives as an RSC slot, so
// props cannot carry the handlers.
export type ThreadActions = {
  state: ThreadState;
  votedThread: boolean;
  // The thread's pin/lock as the session sees them: the fixture flags with
  // the admin overrides merged in.
  pinned: boolean;
  locked: boolean;
  // Admin-only: the pin/lock controls render for admins alone, and the
  // transitions below no-op for anyone else.
  canModerate: boolean;
  onToggleThreadVote: () => void;
  onTogglePostVote: (postId: string) => void;
  onEditPost: (postId: string, body: string) => void;
  onDeletePost: (postId: string) => void;
  onTogglePin: () => void;
  onToggleLock: () => void;
  // `replyTo` names the post the reply answers; the root reply has none.
  onReply: (body: string, replyTo?: string) => void;
};

// The parent a reply points at, resolved for the marker and the composer chip:
// the face and the name survive a tombstone, the excerpt does not.
export type ReplyTarget = {
  id: string;
  user: string;
  avatar?: string;
  excerpt?: string;
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
