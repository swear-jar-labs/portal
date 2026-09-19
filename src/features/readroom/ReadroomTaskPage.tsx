import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { messages } from "@/content/messages";
import { getReadroom, listReadrooms } from "./data";
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
  const now = new Date().toISOString();

  return (
    <ReadroomStack
      readrooms={readrooms}
      now={now}
      task={{
        id: readroom.id,
        title: readroom.title,
        layer: <ReadroomPanel readroom={readroom} now={now} />,
      }}
    />
  );
}
