"use client";

import type { MouseEvent } from "react";
import { useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Stack } from "@swearjar/dos";
import { useLoginPrompt, useOverlayPush, useShellSession } from "@/features/shell";
import * as boardStore from "../data/board-store";
import { syncThreadVote } from "../data/thread-mutations";
import {
  FEED_PATH,
  threadPath,
  type BoardId,
  type TagId,
  type ThreadSummary,
  type ThreadTechId,
} from "../model/threads";
import { ThreadCard, threadCardId } from "./ThreadCard";

export type JournalRowsProps = {
  board: BoardId;
  // The board's fixture summaries (preview-sized by the caller).
  threads: readonly ThreadSummary[];
  now: string;
};

/** One board's journal as the board's own cards: the same ThreadCard the feed
 * renders, over the session store directly (no feed query to fake) — votes
 * overlay the server summaries through the shared mutation sync, so the
 * journal reads what the board reads. Tag filtering stays global, as on
 * the board. */
export function JournalRows({ board, threads, now }: JournalRowsProps) {
  const router = useRouter();
  const pushOverlay = useOverlayPush();
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const state = useSyncExternalStore(
    boardStore.subscribeBoard,
    boardStore.boardSnapshot,
    boardStore.boardServerSnapshot,
  );

  const gate = (action: () => void) => {
    if (session === null) {
      requestLogin();
      return;
    }
    action();
  };

  const rows = useMemo(() => {
    // The journal reads summaries only, so unlike the feed it cannot dedupe
    // confirmed replies against server post ids: every session post counts
    // as echoed (commitReply adds only server-confirmed ones). Counts may
    // lag until the refetch lands, but never double after revalidation.
    const echoed = boardStore.echoedConfirmedPosts(state.threads);
    return boardStore
      .withSessionFlags(
        boardStore.withLocalActivity([...threads], state.threads, echoed),
        state.flags,
      )
      .map((summary) =>
        state.votedThreads.has(summary.id) ? { ...summary, votes: summary.votes + 1 } : summary,
      );
  }, [threads, state.flags, state.threads, state.votedThreads]);

  const activateThread = (threadId: string, event?: MouseEvent<HTMLElement>) => {
    // The root slot intercepts the thread above the current stack: the
    // journal card stays mounted and returns focus when the overlay peels.
    pushOverlay(threadPath(threadId), threadCardId(threadId))(event);
  };

  const filterTag = (tag: TagId) => {
    // Tag filtering keeps the project scope: the board opens on this journal.
    router.push(`${FEED_PATH}?board=${board}&tag=${tag}`);
  };

  const filterTech = (tech: ThreadTechId) => {
    router.push(`${FEED_PATH}?board=${board}&tech=${tech}`);
  };

  return (
    <Stack gap={8}>
      {rows.map((thread) => (
        <Stack key={thread.id} navRow>
          <ThreadCard
            thread={thread}
            now={now}
            voted={state.votedThreads.has(thread.id)}
            onActivate={(event) => activateThread(thread.id, event)}
            onVote={() => gate(() => syncThreadVote(thread.id))}
            onFilterTag={filterTag}
            onFilterTech={filterTech}
          />
        </Stack>
      ))}
    </Stack>
  );
}
