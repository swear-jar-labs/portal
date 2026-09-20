"use client";

import type { MouseEvent } from "react";
import { Button, Field, Stack, Text, Heading, Select, type SelectOption } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import type { ProjectSlug } from "@/features/projects/contracts";
import {
  composeButtonId,
  isDefaultTicketQuery,
  ticketPath,
  ticketSizes,
  ticketStatuses,
  ticketTagIds,
  type Ticket,
  type TicketQuery,
  type TicketStatus,
  type TicketSize,
  type TicketTagId,
} from "./tickets";
import { TicketsTable, type TicketTableAction } from "./TicketsTable";

export type TicketProjectOption = {
  slug: ProjectSlug;
  name: string;
};

export type TicketsFeedProps = {
  tickets: readonly Ticket[];
  query: TicketQuery;
  projects: readonly TicketProjectOption[];
  projectNames: Readonly<Record<string, string>>;
  currentKey?: string;
  localKeys: ReadonlySet<string>;
  onQueryChange: (patch: Partial<TicketQuery>) => void;
  onActivate: (key: string, event?: MouseEvent<HTMLElement>) => void;
  onCompose: () => void;
};

type ProjectFilter = ProjectSlug | "all";
type SizeFilter = TicketSize | "all";
type StatusFilter = TicketStatus | "all";
type TagFilter = TicketTagId | "all";

const projectOptions = (
  projects: readonly TicketProjectOption[],
): SelectOption<ProjectFilter>[] => [
  { value: "all", label: messages.tickets.feed.filters.allProjects },
  ...projects.map((project) => ({ value: project.slug, label: project.name })),
];

const statusOptions: SelectOption<StatusFilter>[] = [
  { value: "all", label: messages.tickets.feed.filters.allStatuses },
  ...ticketStatuses.map((status) => ({
    value: status,
    label: messages.tickets.statuses[status],
  })),
];

const sizeOptions: SelectOption<SizeFilter>[] = [
  { value: "all", label: messages.tickets.feed.filters.allSizes },
  ...ticketSizes.map((size) => ({ value: size, label: size })),
];

const tagOptions: SelectOption<TagFilter>[] = [
  { value: "all", label: messages.tickets.feed.filters.allTags },
  ...ticketTagIds.map((tag) => ({ value: tag, label: messages.tickets.tags[tag] })),
];

const assigneeOptions: SelectOption<TicketQuery["assignee"]>[] = [
  { value: "all", label: messages.tickets.feed.filters.allAssignees },
  { value: "none", label: messages.tickets.feed.unassigned },
];

/** The work queue: every ticket as a table row, filterable without
 * leaving the tracker. KEY opens the dossier; the rest of the row is text. */
export function TicketsFeed({
  tickets,
  query,
  projects,
  projectNames,
  currentKey,
  localKeys,
  onQueryChange,
  onActivate,
  onCompose,
}: TicketsFeedProps) {
  const actionForTicket = (ticket: Ticket): TicketTableAction => ({
    ...(localKeys.has(ticket.key) ? {} : { href: ticketPath(ticket.key) }),
    onActivate: (event) => onActivate(ticket.key, event),
  });

  const isDefault = isDefaultTicketQuery(query);

  return (
    <Stack gap={8}>
      <Heading level={1} className="sr-only">
        {messages.tickets.feed.heading}
      </Heading>

      <Stack direction="row" gap={8} align="center" wrap navRow>
        <Text role="hint">{formatCount(tickets.length, pluralForms.ticket)}</Text>
        <Button id={composeButtonId} variant="primary" onClick={onCompose}>
          {messages.tickets.feed.newTicket}
        </Button>
      </Stack>

      <Stack direction="row" gap={8} wrap navRow>
        <Select
          label={messages.tickets.feed.filters.project}
          name="project"
          value={query.project}
          onChange={(project: ProjectFilter) => onQueryChange({ project })}
          options={projectOptions(projects)}
        />
        <Select
          label={messages.tickets.feed.filters.size}
          name="size"
          value={query.size}
          onChange={(size: SizeFilter) => onQueryChange({ size })}
          options={sizeOptions}
        />
        <Select
          label={messages.tickets.feed.filters.status}
          name="status"
          value={query.status}
          onChange={(status: StatusFilter) => onQueryChange({ status })}
          options={statusOptions}
        />
        <Select
          label={messages.tickets.feed.filters.assignee}
          name="assignee"
          value={query.assignee}
          onChange={(assignee) => onQueryChange({ assignee })}
          options={assigneeOptions}
        />
        <Select
          label={messages.tickets.feed.filters.tag}
          name="tag"
          value={query.tag}
          onChange={(tag: TagFilter) => onQueryChange({ tag })}
          options={tagOptions}
        />
        <Field
          label={messages.tickets.feed.filters.search}
          name="q"
          value={query.q}
          onChange={(q: string) => onQueryChange({ q })}
        />
      </Stack>

      {tickets.length === 0 ? (
        <Text role="hint">
          {isDefault ? messages.tickets.feed.empty : messages.tickets.feed.noMatch}
        </Text>
      ) : (
        <TicketsTable
          tickets={tickets}
          projectNames={projectNames}
          currentKey={currentKey}
          actionForTicket={actionForTicket}
        />
      )}
    </Stack>
  );
}
