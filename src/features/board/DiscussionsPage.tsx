import { Suspense } from "react";
import type { Metadata } from "next";
import { messages } from "@/content/messages";
import { listThreads } from "@/shared/board/threads";
import { BoardFallback, BoardStack } from "./BoardStack";

export const discussionsMetadata: Metadata = messages.board.metadata;

export async function DiscussionsPage() {
  const threads = await listThreads();
  const now = new Date().toISOString();

  // The feed reads the URL filters with useSearchParams: the boundary keeps the
  // static shell prerenderable (see the Next docs on the CSR bailout).
  return (
    <Suspense fallback={<BoardFallback />}>
      <BoardStack threads={threads} now={now} />
    </Suspense>
  );
}
