import type { Metadata } from "next";
import { messages } from "@/content/messages";
import { isKnownProjectSlug, listProjects } from "@/features/projects/contracts";
import { listTickets } from "./data";
import { parseTicketQuery } from "./tickets";
import { TicketsStack } from "./TicketsStack";

export const ticketsMetadata: Metadata = messages.tickets.metadata;

export type TicketsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function TicketsPage({ searchParams }: TicketsPageProps) {
  const [tickets, projects, params] = await Promise.all([
    listTickets(),
    listProjects(),
    searchParams,
  ]);
  const query = parseTicketQuery(params, isKnownProjectSlug);
  const initialCompose = params.new === "1" && query.project !== "all";
  const options = projects.map((project) => ({
    slug: project.slug,
    name: project.name,
    maintainers: project.maintainers.map((person) => person.user),
    assignmentsPaused: project.maintainers.length === 0,
    claimPolicy: project.claimPolicy,
  }));

  return (
    <TicketsStack
      tickets={tickets}
      projects={options}
      initialQuery={query}
      initialCompose={initialCompose}
      now={new Date().toISOString()}
    />
  );
}
