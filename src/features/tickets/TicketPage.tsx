import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { messages } from "@/content/messages";
import { listProjects, projectName } from "@/features/projects/contracts";
import { listReadroomsByTicket } from "@/features/readroom/contracts";
import { getTicketByKey, listTickets } from "./data";
import { TicketPanel } from "./TicketPanel";
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
  const options = projects.map((project) => ({ slug: project.slug, name: project.name }));
  const now = new Date().toISOString();

  return (
    <TicketsStack
      tickets={tickets}
      projects={options}
      now={now}
      ticket={{
        key: ticket.key,
        title: ticket.title,
        layer: (
          <TicketPanel
            ticket={ticket}
            tickets={tickets}
            projectName={projectName(ticket.project)}
            readrooms={readrooms}
            now={now}
          />
        ),
      }}
    />
  );
}
