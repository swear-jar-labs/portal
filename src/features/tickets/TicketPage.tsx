import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { messages } from "@/content/messages";
import { listProjects, projectName } from "@/features/projects/contracts";
import { listReadroomsByTicket } from "@/features/readroom/contracts";
import { getTicketByKey, listTickets } from "./data";
import { TicketsStack } from "./TicketsStack";

export type TicketPageProps = { params: Promise<{ key: string }> };

export async function generateTicketMetadata({ params }: TicketPageProps): Promise<Metadata> {
  const { key } = await params;
  const ticket = await getTicketByKey(key.toUpperCase());
  return {
    title: ticket
      ? `${ticket.key}: ${ticket.title} — ${messages.metadata.title}`
      : messages.tickets.metadata.title,
  };
}

export async function TicketPage({ params }: TicketPageProps) {
  const { key } = await params;
  const ticket = await getTicketByKey(key.toUpperCase());
  if (!ticket) notFound();

  const [tickets, projects, readrooms] = await Promise.all([
    listTickets(),
    listProjects(),
    listReadroomsByTicket(ticket.key),
  ]);
  const options = projects.map((project) => ({
    slug: project.slug,
    name: project.name,
    maintainers: project.maintainers.map((person) => person.user),
    assignmentsPaused: project.maintainers.length === 0,
    claimPolicy: project.claimPolicy,
  }));
  const now = new Date().toISOString();

  return (
    <TicketsStack
      tickets={tickets}
      projects={options}
      now={now}
      ticket={{ ticket, projectName: projectName(ticket.project), readrooms }}
    />
  );
}
