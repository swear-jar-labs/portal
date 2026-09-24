import { Suspense } from "react";
import type { Metadata } from "next";
import { messages } from "@/content/messages";
import { listProjects } from "@/features/projects/contracts";
import { getThread, listThreads } from "./data";
import { BoardFallback, BoardStack } from "./BoardStack";
import { loadThreadLayer } from "./ThreadOverlay";
import { threadDocumentTitle } from "./threads";

export type ThreadPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateThreadMetadata({ params }: ThreadPageProps): Promise<Metadata> {
  const { id } = await params;
  const thread = await getThread(id);
  return {
    title: thread ? threadDocumentTitle(thread) : messages.board.metadata.title,
  };
}

export async function ThreadPage({ params }: ThreadPageProps) {
  const { id } = await params;
  const now = new Date().toISOString();
  const thread = await loadThreadLayer(id, now);
  const [threads, projects] = await Promise.all([listThreads(), listProjects()]);

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
        thread={thread}
      />
    </Suspense>
  );
}
