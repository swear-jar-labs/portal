"use client";

import type { MouseEvent } from "react";
import { useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Stack } from "@swearjar/dos";
import { useLoginPrompt, useOverlayPush, useShellSession } from "@/features/shell";
import * as boardStore from "./board-store";
import { FEED_PATH, threadPath, type BoardId, type TagId, type ThreadSummary } from "./threads";
import { ThreadCard, threadCardId } from "./ThreadCard";

export type JournalRowsProps = {
  board: BoardId;
  // The board's fixture summaries (preview-sized by the caller).
  threads: readonly ThreadSummary[];
  now: string;
};

/** One board's journal as the board's own cards: the same ThreadCard the feed
 * renders, over the session store directly (no feed query to fake) — votes and
 * session replies overlay the fixtures, so the journal reads what the board
 * reads. Threads composed in this session have no route yet, so the journal
 * skips them (the board opens them in place); tag filtering stays global, as
 * on the board. */
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

  const rows = useMemo(
    () =>
      boardStore
        .withLocalActivity([...threads], state.threads)
        .map((summary) =>
          state.votedThreads.has(summary.id) ? { ...summary, votes: summary.votes + 1 } : summary,
        ),
    [threads, state.threads, state.votedThreads],
  );

  const activateThread = (threadId: string, event?: MouseEvent<HTMLElement>) => {
    // The root slot intercepts the thread above the current stack: the
    // journal card stays mounted and returns focus when the overlay peels.
    pushOverlay(threadPath(threadId), threadCardId(threadId))(event);
  };

  const filterTag = (tag: TagId) => {
    // Tag filtering keeps the project scope: the board opens on this journal.
    router.push(`${FEED_PATH}?board=${board}&tag=${tag}`);
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
            onVote={() => gate(() => boardStore.toggleThreadVote(thread.id))}
            onFilterTag={filterTag}
          />
        </Stack>
      ))}
    </Stack>
  );
}
