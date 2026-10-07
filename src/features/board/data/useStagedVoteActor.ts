"use client";

import { useEffect, useRef } from "react";

import * as boardStore from "./board-store";

// The staged vote intents outlive a single action by design (they cover the
// settle→revalidation window), so they must not outlive their actor: a
// logoff/logon inside one SPA session drops them, or the next member would
// inherit the previous one's pressed state. Server-confirmed votes need no
// guard — they render from the queries under the new actor.
export function useStagedVoteActor(user: string | null): void {
  const previous = useRef(user);
  useEffect(() => {
    if (previous.current === user) return;
    previous.current = user;
    boardStore.clearStagedThreadVotes();
  }, [user]);
}
