import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { messages } from "@/content/messages";
import { listProjects } from "@/features/projects/contracts";
import { listTickets } from "@/features/tickets/contracts";
import { getReadroom, listReadrooms, projectRepoMap } from "./data";
import { ReadroomPanel } from "./ReadroomPanel";
import { ReadroomStack } from "./ReadroomStack";

export type ReadroomTaskPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateReadroomMetadata({
  params,
}: ReadroomTaskPageProps): Promise<Metadata> {
  const { id } = await params;
  const readroom = await getReadroom(id);
  return {
    title: readroom
      ? `${readroom.title} — ${messages.metadata.title}`
      : messages.readroom.metadata.title,
  };
}

export async function ReadroomTaskPage({ params }: ReadroomTaskPageProps) {
  const { id } = await params;
  const readroom = await getReadroom(id);
  if (!readroom) notFound();

  const readrooms = await listReadrooms();
  const tickets = await listTickets();
  const projectRepos = projectRepoMap(await listProjects());
  const now = new Date().toISOString();

  return (
    <ReadroomStack
      readrooms={readrooms}
      tickets={tickets}
      projectRepos={projectRepos}
      now={now}
      task={{
        id: readroom.id,
        title: readroom.title,
        layer: <ReadroomPanel readroom={readroom} tickets={tickets} now={now} />,
      }}
    />
  );
}
