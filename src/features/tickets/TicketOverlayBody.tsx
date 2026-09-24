"use client";

import { useRouter } from "next/navigation";
import type { ClaimPolicy } from "@/features/projects/contracts";
import type { ReadroomRef } from "@/features/readroom/contracts";
import { submitTicketEdit } from "./edit-submit";
import * as ticketStore from "./ticket-store";
import { TicketEdit } from "./TicketEdit";
import { TicketPanel } from "./TicketPanel";
import { ticketEditPath, type Ticket } from "./tickets";
import { useTicketState } from "./useTicketSession";

export type TicketOverlayDossierProps = {
  ticket: Ticket;
  tickets: readonly Ticket[];
  projectName: string;
  maintainers: readonly string[];
  assignmentsPaused: boolean;
  claimPolicy: ClaimPolicy;
  readrooms: readonly ReadroomRef[];
  now: string;
};

/**
 * The intercepted ticket dossier: the same TicketPanel the section stack
 * renders, with the edit request routed into the overlay's own second panel
 * (`?edit=1`) instead of the stack's local edit state.
 */
export function TicketOverlayDossier({
  ticket,
  tickets,
  projectName,
  maintainers,
  assignmentsPaused,
  claimPolicy,
  readrooms,
  now,
}: TicketOverlayDossierProps) {
  const router = useRouter();

  return (
    <TicketPanel
      ticket={ticket}
      tickets={tickets}
      projectName={projectName}
      maintainers={maintainers}
      assignmentsPaused={assignmentsPaused}
      claimPolicy={claimPolicy}
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
  maintainers,
}: {
  ticket: Ticket;
  tickets: readonly Ticket[];
  maintainers: readonly string[];
}) {
  const router = useRouter();
  const state = useTicketState();
  const live = ticketStore.withSessionState(ticket, state);

  return (
    <TicketEdit
      ticket={live}
      tickets={tickets}
      maintainers={maintainers}
      onSubmit={(input, assignee) => {
        submitTicketEdit(live, input, assignee);
        router.back();
      }}
      onCancel={() => router.back()}
    />
  );
}
