import { Suspense } from "react";
import type { Metadata } from "next";
import { messages } from "@/content/messages";
import { listProjects } from "@/features/projects/contracts";
import { listThreads } from "./data";
import { BoardFallback, BoardStack } from "./BoardStack";

export const discussionsMetadata: Metadata = messages.board.metadata;

export async function DiscussionsPage() {
  const [threads, projects] = await Promise.all([listThreads(), listProjects()]);
  const now = new Date().toISOString();

  // The feed reads the URL filters with useSearchParams: the boundary keeps the
  // static shell prerenderable (see the Next docs on the CSR bailout).
  return (
    <Suspense fallback={<BoardFallback />}>
      <BoardStack
        threads={threads}
        now={now}
        projectBoards={projects.map((project) => ({
          id: project.slug,
          name: project.name,
          archived: project.status === "archived",
        }))}
      />
    </Suspense>
  );
}
