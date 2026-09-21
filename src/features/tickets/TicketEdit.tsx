"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Field,
  Form,
  Heading,
  Select,
  Stack,
  Text,
  type SelectOption,
} from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useShellSession } from "@/features/shell";
import { ticketAssigneeSchema, ticketEditSchema, type TicketEditInput } from "./schema";
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

// The statuses an assignee (not a maintainer) may move between: starting and
// reviewing their work. done/closed and reopening to open belong to the
// maintainers; the submit guard enforces it, the options only suggest it.
const ASSIGNEE_STATUSES: readonly TicketStatus[] = ["in_progress", "review"];

type EditErrors = TicketFieldsErrors & { assignee?: string };

export type TicketEditProps = {
  ticket: Ticket;
  // The whole queue: the gate resolves the open blockers against it.
  tickets: readonly Ticket[];
  // The project's maintainers: only they see every field and reassign anyone.
  maintainers: readonly string[];
  // The maintainer's reassignment: a user sets it, null clears it, undefined
  // leaves it alone. Never gated by the claim ladder, by design.
  onSubmit: (input: TicketEditInput, assignee: string | null | undefined) => void;
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

function isContentDirty(values: TicketEditInput, ticket: Ticket): boolean {
  return (
    values.title !== ticket.title ||
    values.body !== ticket.body ||
    values.size !== ticket.size ||
    values.priority !== ticket.priority ||
    !sameTags(values.tags, ticket.tags)
  );
}

/** The editor's layer in a light panel, applied by SAVE and dropped by CANCEL
 * (the draft never touches the store). The fields follow the editor's seat:
 * maintainers see everything and reassign, authors fix title/body/tags, the
 * assignee moves open → in_progress ↔ review. Starting a blocked ticket is
 * refused with the list. */
export function TicketEdit({ ticket, tickets, maintainers, onSubmit, onCancel }: TicketEditProps) {
  const session = useShellSession();
  const state = useTicketState();
  const live = ticketStore.withSessionState(ticket, state);
  const all = useMergedTickets(tickets);
  const byId = useMemo(() => ticketsById(all), [all]);
  const [values, setValues] = useState<TicketEditInput>(() => draftOf(live));
  const [assigneeText, setAssigneeText] = useState(live.assignee?.user ?? "");
  const [errors, setErrors] = useState<EditErrors>({});

  const isMaintainer = session !== null && maintainers.includes(session.user);
  const isAuthor = session !== null && session.user === live.author.user;
  const isAssignee = session !== null && session.user === live.assignee?.user;

  const statusOptions: SelectOption<TicketStatus>[] = useMemo(() => {
    const allowed = isMaintainer
      ? ticketStatuses
      : ASSIGNEE_STATUSES.includes(live.status) || live.status === "open"
        ? (["open", ...ASSIGNEE_STATUSES] as const)
        : ASSIGNEE_STATUSES;
    const listed = allowed.includes(live.status) ? allowed : [...allowed, live.status];
    return listed.map((status) => ({ value: status, label: messages.tickets.statuses[status] }));
  }, [isMaintainer, live.status]);

  const contentChanged = isMaintainer || isAuthor ? isContentDirty(values, live) : false;
  const statusChanged = values.status !== live.status;
  const assigneeChanged = isMaintainer && assigneeText.trim() !== (live.assignee?.user ?? "");
  // The author's seat never dirties the status; the assignee's never the content.
  const dirty =
    contentChanged || (statusChanged && (isMaintainer || isAssignee)) || assigneeChanged;

  function update(patch: Partial<TicketEditInput>) {
    // The refusals explain the chosen value: changing it clears the stale error.
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
    if (!isMaintainer && !isAuthor && !isAssignee) return;
    // The content fields the role cannot see stay at the live values.
    const input: TicketEditInput =
      isMaintainer || isAuthor
        ? parsed.data
        : {
            title: live.title,
            body: live.body,
            size: live.size,
            priority: live.priority,
            status: parsed.data.status,
            tags: [...live.tags],
          };
    if (!isMaintainer) {
      // Authors never touch the status; assignees stay inside their range
      // (open → in_progress ↔ review, never done/closed, never back to open).
      const changed = input.status !== live.status;
      const allowed = !changed || (isAssignee && ASSIGNEE_STATUSES.includes(input.status));
      if (!allowed) {
        setErrors({ status: messages.tickets.edit.statusRefused });
        return;
      }
    }
    // The gate is only on the start: the blockers must have finished.
    const blockers = openBlockers(live, byId).map((blocker) => blocker.key);
    if (input.status === "in_progress" && blockers.length > 0) {
      setErrors({ status: `${messages.tickets.edit.blocked} ${blockers.join(", ")}` });
      return;
    }
    if (isMaintainer) {
      const previous = live.assignee?.user ?? "";
      if (assigneeText.trim() !== previous) {
        if (assigneeText.trim() === "") {
          setErrors({});
          onSubmit(input, null);
          return;
        }
        const named = ticketAssigneeSchema.safeParse(assigneeText);
        if (!named.success) {
          setErrors({ assignee: messages.tickets.edit.badAssignee });
          return;
        }
        setErrors({});
        onSubmit(input, named.data);
        return;
      }
    }
    setErrors({});
    onSubmit(input, undefined);
  }

  return (
    <Form onSubmit={handleSubmit} ariaLabel={messages.tickets.edit.heading}>
      <Stack gap={10}>
        <Heading level={1}>{messages.tickets.edit.heading}</Heading>

        {isMaintainer || isAuthor ? (
          <TicketFields
            values={values}
            errors={errors}
            onChange={update}
            hideQueueFields={!isMaintainer}
          >
            {isMaintainer ? (
              <Select
                label={messages.tickets.dossier.status}
                name="status"
                value={values.status}
                onChange={(status) => update({ status })}
                options={statusOptions}
                error={errors.status}
              />
            ) : null}
          </TicketFields>
        ) : (
          <Select
            label={messages.tickets.dossier.status}
            name="status"
            value={values.status}
            onChange={(status) => update({ status })}
            options={statusOptions}
            error={errors.status}
          />
        )}

        {isMaintainer ? (
          <Stack gap={4}>
            <Field
              label={messages.tickets.edit.assignee}
              name="assignee"
              value={assigneeText}
              onChange={(next) => {
                setAssigneeText(next);
                setErrors((current) => ({ ...current, assignee: undefined }));
              }}
              error={errors.assignee}
            />
            <Text role="hint">{messages.tickets.edit.assigneeHint}</Text>
          </Stack>
        ) : null}

        <Stack direction="row" gap={10} wrap navRow>
          <Button type="submit" variant="primary" disabled={!dirty}>
            {messages.tickets.edit.save}
          </Button>
          <Button onClick={onCancel}>{messages.tickets.edit.cancel}</Button>
        </Stack>
        <Text role="hint">{messages.tickets.edit.hint}</Text>
      </Stack>
    </Form>
  );
}
