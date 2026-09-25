import type { Metadata } from "next";
import { messages } from "@/content/messages";
import { getTicketByKey } from "./data";
import { loadTicketLayer } from "./TicketOverlay";
import { TicketsStack } from "./TicketsStack";
import { ticketDocumentTitle } from "./tickets";

export type TicketPageProps = {
  params: Promise<{ key: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateTicketMetadata({ params }: TicketPageProps): Promise<Metadata> {
  const { key } = await params;
  const ticket = await getTicketByKey(key.toUpperCase());
  return {
    title: ticket ? ticketDocumentTitle(ticket) : messages.tickets.metadata.title,
  };
}

export async function TicketPage({ params }: TicketPageProps) {
  const { key } = await params;
  const now = new Date().toISOString();
  const layer = await loadTicketLayer(key, now);
  const options = layer.projects.map((project) => ({
    slug: project.slug,
    name: project.name,
    maintainers: project.maintainers.map((person) => person.user),
    assignmentsPaused: project.maintainers.length === 0,
    claimPolicy: project.claimPolicy,
  }));

  return (
    <TicketsStack
      tickets={layer.tickets}
      projects={options}
      now={now}
      ticket={{
        ticket: layer.ticket,
        projectName: layer.projectName,
        readrooms: layer.readrooms,
      }}
    />
  );
}
