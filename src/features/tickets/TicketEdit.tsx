"use client";

import { useMemo, useState } from "react";
import {
  Button,
  ComboBox,
  Form,
  Heading,
  Select,
  Stack,
  Text,
  type ComboBoxOption,
  type SelectOption,
} from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useShellSession } from "@/features/shell";
import type { TicketEditChanges, TicketEditFailure } from "./edit-submit";
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
import {
  canWriteTicket,
  canChangeTicketStatus,
  isProjectManager,
  reviewerCandidates,
  type TicketProject,
} from "./workflow";

type EditErrors = TicketFieldsErrors & { assignee?: string; reviewer?: string; general?: string };

export type TicketEditProps = {
  ticket: Ticket;
  // The whole queue: the gate resolves the open blockers against it.
  tickets: readonly Ticket[];
  project: TicketProject;
  memberUsers: readonly string[];
  // Manager changes to assignee and reviewer use set/null/unchanged semantics.
  // Reassigning assignee is never gated by the claim ladder.
  onSubmit: (
    input: TicketEditInput,
    changes: TicketEditChanges,
  ) => Promise<TicketEditFailure | null>;
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
export function TicketEdit({
  ticket,
  tickets,
  project,
  memberUsers,
  onSubmit,
  onCancel,
}: TicketEditProps) {
  const session = useShellSession();
  const state = useTicketState();
  const live = ticketStore.withSessionState(ticket, state);
  const all = useMergedTickets(tickets);
  const byId = useMemo(() => ticketsById(all), [all]);
  const [values, setValues] = useState<TicketEditInput>(() => draftOf(live));
  const [assigneeText, setAssigneeText] = useState(live.assignee?.user ?? "");
  const [assigneeQuery, setAssigneeQuery] = useState(
    live.assignee?.user ?? messages.tickets.dossier.assigneeUnassigned,
  );
  const [reviewerText, setReviewerText] = useState(live.reviewer?.user ?? "");
  const [reviewerQuery, setReviewerQuery] = useState(
    live.reviewer?.user ?? messages.tickets.edit.reviewerNone,
  );
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<EditErrors>({});

  const canWrite = canWriteTicket(session, project);
  const isMaintainer = isProjectManager(session, project) && canWrite;
  const isAuthor = canWrite && session?.user === live.author.user;
  const isAssignee = canWrite && session?.user === live.assignee?.user;
  const assigneeOptions: ComboBoxOption<string>[] = [
    { value: "", label: messages.tickets.dossier.assigneeUnassigned },
    ...memberUsers.map((user) => ({ value: user, label: user })),
  ];
  const reviewerOptions: ComboBoxOption<string>[] = [
    { value: "", label: messages.tickets.edit.reviewerNone },
    ...reviewerCandidates(project, assigneeText).map((user) => ({
      value: user,
      label: user,
    })),
  ];

  const statusOptions: SelectOption<TicketStatus>[] = useMemo(() => {
    const allowed = isMaintainer
      ? ticketStatuses
      : ticketStatuses.filter((status) => canChangeTicketStatus(session, live, status));
    return allowed.map((status) => ({ value: status, label: messages.tickets.statuses[status] }));
  }, [isMaintainer, live, session]);

  const contentChanged = isMaintainer || isAuthor ? isContentDirty(values, live) : false;
  const statusChanged = values.status !== live.status;
  const assigneeChanged = isMaintainer && assigneeText !== (live.assignee?.user ?? "");
  const reviewerChanged = isMaintainer && reviewerText !== (live.reviewer?.user ?? "");
  // The author's seat never dirties the status; the assignee's never the content.
  const dirty =
    contentChanged ||
    (statusChanged && (isMaintainer || isAssignee)) ||
    assigneeChanged ||
    reviewerChanged;

  function update(patch: Partial<TicketEditInput>) {
    // The refusals explain the chosen value: changing it clears the stale error.
    if (patch.status !== undefined) setErrors((current) => ({ ...current, status: undefined }));
    setValues((current) => ({ ...current, ...patch }));
  }

  async function handleSubmit() {
    if (pending) return;
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
    if (!isMaintainer && !isAuthor && !isAssignee) {
      setErrors({ general: messages.tickets.edit.denied });
      return;
    }
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
      if (!canChangeTicketStatus(session, live, input.status)) {
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
    const assignee = assigneeText === "" ? null : assigneeText;
    if (
      isMaintainer &&
      reviewerChanged &&
      reviewerText !== "" &&
      !reviewerCandidates(project, assigneeText).includes(reviewerText)
    ) {
      setErrors({ reviewer: messages.tickets.edit.reviewerInvalid });
      return;
    }
    const changes: TicketEditChanges = {
      assignee: isMaintainer && assigneeChanged ? assignee : undefined,
      reviewer: reviewerChanged ? reviewerText || null : undefined,
    };
    setPending(true);
    const failure = await onSubmit(input, changes);
    setPending(false);
    if (failure === "assignee") setErrors({ assignee: messages.tickets.edit.badAssignee });
    else if (failure === "active") setErrors({ assignee: messages.tickets.edit.activeAssignee });
    else if (failure === "reviewer") setErrors({ reviewer: messages.tickets.edit.reviewerInvalid });
    else if (failure === "status") setErrors({ status: messages.tickets.edit.statusRefused });
    else if (failure === "blocked") setErrors({ status: messages.tickets.edit.blocked });
    else if (failure === "denied") setErrors({ general: messages.tickets.edit.denied });
    else setErrors({});
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
            <ComboBox
              label={messages.tickets.edit.assignee}
              name="assignee"
              value={assigneeQuery}
              onChange={setAssigneeQuery}
              onPick={(option) => {
                setAssigneeText(option.value);
                setAssigneeQuery(option.label);
                if (reviewerText === option.value) {
                  setReviewerText("");
                  setReviewerQuery(messages.tickets.edit.reviewerNone);
                }
                setErrors((current) => ({ ...current, assignee: undefined, reviewer: undefined }));
              }}
              options={assigneeOptions}
              committedValue={assigneeText}
              emptyText={messages.tickets.edit.assigneeNoMatch}
              submitOnNoMatch={false}
              error={errors.assignee}
            />
            <ComboBox
              label={messages.tickets.edit.reviewer}
              name="reviewer"
              value={reviewerQuery}
              onChange={setReviewerQuery}
              onPick={(option) => {
                setReviewerText(option.value);
                setReviewerQuery(option.label);
                setErrors((current) => ({ ...current, reviewer: undefined }));
              }}
              options={reviewerOptions}
              committedValue={reviewerText}
              emptyText={messages.tickets.edit.reviewerNoMatch}
              submitOnNoMatch={false}
              error={errors.reviewer}
            />
            <Text role="hint">{messages.tickets.edit.reviewerHint}</Text>
          </Stack>
        ) : null}

        {errors.general ? <Text role="danger">{errors.general}</Text> : null}

        <Stack direction="row" gap={10} wrap navRow>
          <Button type="submit" variant="primary" disabled={!dirty || pending}>
            {messages.tickets.edit.save}
          </Button>
          <Button onClick={onCancel}>{messages.tickets.edit.cancel}</Button>
        </Stack>
        <Text role="hint">{messages.tickets.edit.hint}</Text>
      </Stack>
    </Form>
  );
}
