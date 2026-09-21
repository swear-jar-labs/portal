"use client";

import { useMemo, useState } from "react";
import { Button, Form, Heading, Select, Stack, Text, type SelectOption } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { ticketEditSchema, type TicketEditInput } from "./schema";
import { TicketFields, type TicketFieldsErrors } from "./TicketFields";
import * as ticketStore from "./ticket-store";
import { useMergedTickets, useTicketState } from "./useTicketSession";
import {
  openBlockers,
  ticketStatuses,
  ticketsById,
  type Ticket,
  type TicketStatus,
} from "./tickets";

const statusOptions: SelectOption<TicketStatus>[] = ticketStatuses.map((status) => ({
  value: status,
  label: messages.tickets.statuses[status],
}));

export type TicketEditProps = {
  ticket: Ticket;
  // The whole queue: the gate resolves the open blockers against it.
  tickets: readonly Ticket[];
  onSubmit: (input: TicketEditInput) => void;
  onCancel: () => void;
};

function draftOf(ticket: Ticket): TicketEditInput {
  return {
    title: ticket.title,
    body: ticket.body,
    size: ticket.size,
    priority: ticket.priority,
    status: ticket.status,
    tags: [...ticket.tags],
  };
}

function sameTags(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((tag) => right.includes(tag));
}

function isDirty(values: TicketEditInput, ticket: Ticket): boolean {
  return (
    values.title !== ticket.title ||
    values.body !== ticket.body ||
    values.size !== ticket.size ||
    values.priority !== ticket.priority ||
    values.status !== ticket.status ||
    !sameTags(values.tags, ticket.tags)
  );
}

/** The editor's layer (the author or a project maintainer): the ticket fields
 * in a light panel, applied by SAVE and dropped by CANCEL (the draft never
 * touches the store). Starting a blocked ticket is refused with the list. */
export function TicketEdit({ ticket, tickets, onSubmit, onCancel }: TicketEditProps) {
  const state = useTicketState();
  const live = ticketStore.withSessionState(ticket, state);
  const all = useMergedTickets(tickets);
  const byId = useMemo(() => ticketsById(all), [all]);
  const [values, setValues] = useState<TicketEditInput>(() => draftOf(live));
  const [errors, setErrors] = useState<TicketFieldsErrors>({});

  function update(patch: Partial<TicketEditInput>) {
    // The blocked refusal explains the chosen status: changing it clears the
    // stale error.
    if (patch.status !== undefined) setErrors((current) => ({ ...current, status: undefined }));
    setValues((current) => ({ ...current, ...patch }));
  }

  function handleSubmit() {
    const parsed = ticketEditSchema.safeParse(values);
    if (!parsed.success) {
      const hasError = (field: keyof TicketFieldsErrors) =>
        parsed.error.issues.some((issue) => issue.path[0] === field);
      setErrors({
        title: hasError("title") ? messages.tickets.compose.errors.title : undefined,
        body: hasError("body") ? messages.tickets.compose.errors.body : undefined,
        tags: hasError("tags") ? messages.tickets.compose.errors.tags : undefined,
      });
      return;
    }
    // The gate is only on the start: the blockers must have finished.
    const blockers = openBlockers(live, byId).map((blocker) => blocker.key);
    if (parsed.data.status === "in_progress" && blockers.length > 0) {
      setErrors({ status: `${messages.tickets.edit.blocked} ${blockers.join(", ")}` });
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  return (
    <Form onSubmit={handleSubmit} ariaLabel={messages.tickets.edit.heading}>
      <Stack gap={10}>
        <Heading level={1}>{messages.tickets.edit.heading}</Heading>

        <TicketFields values={values} errors={errors} onChange={update}>
          <Select
            label={messages.tickets.dossier.status}
            name="status"
            value={values.status}
            onChange={(status) => update({ status })}
            options={statusOptions}
            error={errors.status}
          />
        </TicketFields>

        <Stack direction="row" gap={10} wrap navRow>
          <Button type="submit" variant="primary" disabled={!isDirty(values, live)}>
            {messages.tickets.edit.save}
          </Button>
          <Button onClick={onCancel}>{messages.tickets.edit.cancel}</Button>
        </Stack>
        <Text role="hint">{messages.tickets.edit.hint}</Text>
      </Stack>
    </Form>
  );
}
