import type { Metadata } from "next";
import { messages } from "@/content/messages";
import { listProjects } from "@/features/projects/contracts";
import { listTickets } from "@/features/tickets/contracts";
import { getReadroom, listReadrooms, projectRepoMap } from "../data/queries";
import { loadReadroomLayer } from "./ReadroomOverlay";
import { ReadroomStack } from "../list/ReadroomStack";
import { readroomDocumentTitle } from "../model/readrooms";

export type ReadroomTaskPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateReadroomMetadata({
  params,
}: ReadroomTaskPageProps): Promise<Metadata> {
  const { id } = await params;
  const readroom = await getReadroom(id);
  return {
    title: readroom ? readroomDocumentTitle(readroom) : messages.readroom.metadata.title,
  };
}

export async function ReadroomTaskPage({ params }: ReadroomTaskPageProps) {
  const { id } = await params;
  const now = new Date().toISOString();
  const task = await loadReadroomLayer(id, now);
  const readrooms = await listReadrooms();
  const tickets = await listTickets();
  const projectRepos = projectRepoMap(await listProjects());

  return (
    <ReadroomStack
      readrooms={readrooms}
      tickets={tickets}
      projectRepos={projectRepos}
      now={now}
      task={task}
    />
  );
}
