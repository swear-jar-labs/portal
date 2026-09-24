import { notFound } from "next/navigation";
import { messages } from "@/content/messages";
import { OverlayOutlet } from "@/features/shell";
import { DEFAULT_CLAIM_POLICY, listProjects, type Project } from "@/features/projects/contracts";
import { listReadroomsByTicket, type ReadroomRef } from "@/features/readroom/contracts";
import { getTicketByKey, listTickets } from "./data";
import { TicketOverlayDossier, TicketOverlayEditPanel } from "./TicketOverlayBody";
import type { TicketPageProps } from "./TicketPage";
import {
  TICKET_EDIT_QUERY,
  TICKET_EDIT_QUERY_VALUE,
  ticketDocumentTitle,
  type Ticket,
} from "./tickets";

export type TicketLayerData = {
  ticket: Ticket;
  tickets: readonly Ticket[];
  projects: readonly Project[];
  projectName: string;
  documentTitle: string;
  maintainers: readonly string[];
  assignmentsPaused: boolean;
  claimPolicy: Project["claimPolicy"];
  readrooms: readonly ReadroomRef[];
  now: string;
};

export type TicketOverlayPageProps = TicketPageProps & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The shared ticket detail loader: the direct-load page feeds its stack from
 * here, the overlay interceptor renders the same panel from the same data.
 */
export async function loadTicketLayer(key: string, now: string): Promise<TicketLayerData> {
  const ticket = await getTicketByKey(key.toUpperCase());
  if (!ticket) notFound();

  const [tickets, projects, readrooms] = await Promise.all([
    listTickets(),
    listProjects(),
    listReadroomsByTicket(ticket.key),
  ]);
  const project = projects.find((entry) => entry.slug === ticket.project);

  return {
    ticket,
    tickets,
    projects,
    projectName: project?.name ?? ticket.project,
    documentTitle: ticketDocumentTitle(ticket),
    maintainers: project?.maintainers.map((person) => person.user) ?? [],
    assignmentsPaused: (project?.maintainers.length ?? 0) === 0,
    claimPolicy: project?.claimPolicy ?? DEFAULT_CLAIM_POLICY,
    readrooms,
    now,
  };
}

/** The same ticket panels mounted into the root overlay slot (any section). */
export async function InterceptedTicketPage({ params, searchParams }: TicketOverlayPageProps) {
  const { key } = await params;
  const query = await searchParams;
  const data = await loadTicketLayer(key, new Date().toISOString());
  const editing = query[TICKET_EDIT_QUERY] === TICKET_EDIT_QUERY_VALUE;

  return (
    <OverlayOutlet
      documentTitle={data.documentTitle}
      panels={[
        {
          title: data.ticket.key,
          body: (
            <TicketOverlayDossier
              ticket={data.ticket}
              tickets={data.tickets}
              projectName={data.projectName}
              maintainers={data.maintainers}
              assignmentsPaused={data.assignmentsPaused}
              claimPolicy={data.claimPolicy}
              readrooms={data.readrooms}
              now={data.now}
            />
          ),
        },
        ...(editing
          ? [
              {
                title: messages.tickets.edit.heading,
                body: (
                  <TicketOverlayEditPanel
                    ticket={data.ticket}
                    tickets={data.tickets}
                    maintainers={data.maintainers}
                  />
                ),
              },
            ]
          : []),
      ]}
    />
  );
}
