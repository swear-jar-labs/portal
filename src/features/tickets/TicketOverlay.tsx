import { notFound } from "next/navigation";
import { messages } from "@/content/messages";
import { OverlayOutlet, type WithDocumentTitle } from "@/features/shell";
import { DEFAULT_CLAIM_POLICY, listProjects, type Project } from "@/features/projects/contracts";
import { listReadroomsByTicket } from "@/features/readroom/contracts";
import { getTicketByKey, listTickets } from "./data";
import {
  TicketOverlayDossier,
  TicketOverlayEditPanel,
  type TicketOverlayDossierProps,
} from "./TicketOverlayBody";
import type { TicketPageProps } from "./TicketPage";
import { TICKET_EDIT_QUERY, TICKET_EDIT_QUERY_VALUE, ticketDocumentTitle } from "./tickets";

// One loader feeds two consumers: the direct-load page builds its stack
// options from `projects` + `tickets`, the overlay interceptor renders the
// dossier (and the edit panel) from the dossier props.
export type TicketLayerData = WithDocumentTitle<
  TicketOverlayDossierProps & { projects: readonly Project[] }
>;

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
export async function InterceptedTicketPage({ params, searchParams }: TicketPageProps) {
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
