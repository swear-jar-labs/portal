import type { Metadata } from "next";
import { messages } from "@/content/messages";
import { listProjects } from "@/features/projects/contracts";
import { listTickets } from "@/features/tickets/contracts";
import { listReadrooms, projectRepoMap } from "../data/queries";
import { ReadroomStack } from "./ReadroomStack";

export const readroomMetadata: Metadata = messages.readroom.metadata;

export async function ReadroomPage() {
  const readrooms = await listReadrooms();
  // The compose layer picks a ticket: the stack merges the session's tickets.
  const tickets = await listTickets();
  const projectRepos = projectRepoMap(await listProjects());
  const now = new Date().toISOString();

  // The feed reads no search params: the stack renders without a Suspense
  // boundary (unlike the board's filtered feed).
  return (
    <ReadroomStack readrooms={readrooms} tickets={tickets} projectRepos={projectRepos} now={now} />
  );
}
