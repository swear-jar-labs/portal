"use client";

import { useRouter } from "next/navigation";
import type { ReadroomRef } from "@/features/readroom/contracts";
import { submitTicketEdit } from "./edit-submit";
import * as ticketStore from "./ticket-store";
import { TicketEdit } from "./TicketEdit";
import { TicketPanel } from "./TicketPanel";
import { ticketEditPath, type Ticket } from "./tickets";
import { useTicketState } from "./useTicketSession";
import type { TicketProject } from "./workflow";

export type TicketOverlayDossierProps = {
  ticket: Ticket;
  tickets: readonly Ticket[];
  projectName: string;
  project: TicketProject;
  readrooms: readonly ReadroomRef[];
  now: string;
};

/** The `?edit=1` panel props: the dossier subset the edit form reads. */
export type TicketOverlayEditProps = Pick<
  TicketOverlayDossierProps,
  "ticket" | "tickets" | "project"
> & { memberUsers: readonly string[] };

/**
 * The intercepted ticket dossier: the same TicketPanel the section stack
 * renders, with the edit request routed into the overlay's own second panel
 * (`?edit=1`) instead of the stack's local edit state.
 */
export function TicketOverlayDossier({
  ticket,
  tickets,
  projectName,
  project,
  readrooms,
  now,
}: TicketOverlayDossierProps) {
  const router = useRouter();

  return (
    <TicketPanel
      ticket={ticket}
      tickets={tickets}
      projectName={projectName}
      project={project}
      readrooms={readrooms}
      now={now}
      onEdit={(live) => router.push(ticketEditPath(live.key))}
    />
  );
}

/** The `?edit=1` panel: the same TicketEdit the direct load's stack owns. */
export function TicketOverlayEditPanel({
  ticket,
  tickets,
  project,
  memberUsers,
}: TicketOverlayEditProps) {
  const router = useRouter();
  const state = useTicketState();
  const live = ticketStore.withSessionState(ticket, state);

  return (
    <TicketEdit
      ticket={live}
      tickets={tickets}
      project={project}
      memberUsers={memberUsers}
      onSubmit={async (input, changes) => {
        const result = await submitTicketEdit(live, tickets, input, changes);
        if (result) return result;
        router.back();
        return null;
      }}
      onCancel={() => router.back()}
    />
  );
}
