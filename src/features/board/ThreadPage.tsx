import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { messages } from "@/content/messages";
import { listProjects } from "@/features/projects/contracts";
import { getThread, listThreads } from "./data";
import { BoardFallback, BoardStack } from "./BoardStack";
import { ThreadPanel } from "./ThreadPanel";

export type ThreadPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateThreadMetadata({ params }: ThreadPageProps): Promise<Metadata> {
  const { id } = await params;
  const thread = await getThread(id);
  return {
    title: thread ? `${thread.title} — ${messages.metadata.title}` : messages.board.metadata.title,
  };
}

export async function ThreadPage({ params }: ThreadPageProps) {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) notFound();

  const [threads, projects] = await Promise.all([listThreads(), listProjects()]);
  const now = new Date().toISOString();

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
        thread={{
          id: thread.id,
          title: thread.title,
          layer: <ThreadPanel thread={thread} now={now} />,
        }}
      />
    </Suspense>
  );
}
