import { notFound } from "next/navigation";
import { messages } from "@/content/messages";
import { listMemberUsers } from "@/features/account/contracts";
import { OverlayOutlet, type WithDocumentTitle } from "@/features/shell";
import { DEFAULT_CLAIM_POLICY, listProjects, type Project } from "@/features/projects/contracts";
import { listReadroomsByTicket } from "@/features/readroom/contracts";
import { getTicketByKey, listTickets } from "../data/queries";
import {
  TicketOverlayDossier,
  TicketOverlayEditPanel,
  type TicketOverlayDossierProps,
} from "./TicketOverlayBody";
import type { TicketPageProps } from "./TicketPage";
import { TICKET_EDIT_QUERY, TICKET_EDIT_QUERY_VALUE, ticketDocumentTitle } from "../model/tickets";

// One loader feeds two consumers: the direct-load page builds its stack
// options from `projects` + `tickets`, the overlay interceptor renders the
// dossier (and the edit panel) from the dossier props.
export type TicketLayerData = WithDocumentTitle<
  TicketOverlayDossierProps & { projects: readonly Project[]; memberUsers: readonly string[] }
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
    memberUsers: listMemberUsers(),
    projects,
    projectName: project?.name ?? ticket.project,
    documentTitle: ticketDocumentTitle(ticket),
    project: {
      slug: ticket.project,
      status: project?.status ?? "archived",
      lead: project?.lead ?? null,
      maintainers: project?.maintainers ?? [],
      reviewers: project?.reviewers ?? [],
      claimPolicy: project?.claimPolicy ?? DEFAULT_CLAIM_POLICY,
    },
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
              project={data.project}
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
                    project={data.project}
                    memberUsers={data.memberUsers}
                  />
                ),
              },
            ]
          : []),
      ]}
    />
  );
}
