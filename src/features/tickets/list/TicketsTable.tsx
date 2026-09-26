import type { MouseEvent } from "react";
import { Stack, Table, Tag, type TableColumn } from "@swearjar/dos";
import { MemberAvatar, useMemberIdentity } from "@/shared/MemberIdentity";
import { messages } from "@/content/messages";
import {
  TICKETS_ROW_ATTR,
  isBlocked,
  ticketPath,
  ticketPriorityTones,
  ticketRowId,
  ticketSizeTones,
  ticketStatusTones,
  ticketsById,
  type Ticket,
} from "../model/tickets";
import styles from "../tickets.module.css";

// The tight grid: every column is sized by its content (KEY fits the longest
// key, `CACHE-12345`; SIZE the header plus air; PRIORITY the `NORMAL` chip;
// STATUS the `IN PROGRESS` tag). TITLE carries a floor only and stays flexible,
// so it absorbs the panel's spare width instead of inflating the narrow
// columns.
const ticketColumnWidths = {
  key: 112,
  title: 250,
  size: 48,
  priority: 96,
  status: 116,
  project: 144,
  assignee: 80,
} as const;

const pixels = (value: number) => `${value}px`;
const ticketsTableMinWidth = pixels(
  Object.values(ticketColumnWidths).reduce((total, width) => total + width, 0),
);

export type TicketsTableProps = {
  tickets: readonly Ticket[];
  projectNames: Readonly<Record<string, string>>;
  currentKey?: string;
  actionForTicket?: (ticket: Ticket) => TicketTableAction;
  label?: string;
};

export type TicketTableAction = {
  href?: string;
  onActivate?: (event?: MouseEvent<HTMLElement>) => void;
};

export function TicketsTable({
  tickets,
  projectNames,
  currentKey,
  actionForTicket,
  label = messages.tickets.feed.heading,
}: TicketsTableProps) {
  const byId = ticketsById(tickets);
  const columns: TableColumn<Ticket>[] = [
    {
      id: "key",
      label: messages.tickets.feed.columns.key,
      width: pixels(ticketColumnWidths.key),
      action: (ticket) => {
        const action = actionForTicket?.(ticket) ?? { href: ticketPath(ticket.key) };
        return {
          id: ticketRowId(ticket.key),
          content: ticket.key,
          ...action,
          current: ticket.key === currentKey,
          rowActivation: true,
        };
      },
    },
    {
      id: "title",
      label: messages.tickets.feed.columns.title,
      minWidth: pixels(ticketColumnWidths.title),
      render: (ticket) => ticket.title,
    },
    {
      id: "size",
      label: messages.tickets.feed.columns.size,
      width: pixels(ticketColumnWidths.size),
      className: styles.sizeCell,
      render: (ticket) => <Tag tone={ticketSizeTones[ticket.size]}>{ticket.size}</Tag>,
    },
    {
      id: "priority",
      label: messages.tickets.feed.columns.priority,
      width: pixels(ticketColumnWidths.priority),
      render: (ticket) => (
        <Tag tone={ticketPriorityTones[ticket.priority]}>
          {messages.tickets.priorities[ticket.priority]}
        </Tag>
      ),
    },
    {
      id: "status",
      label: messages.tickets.feed.columns.status,
      width: pixels(ticketColumnWidths.status),
      render: (ticket) => (
        <Stack gap={2} align="flex-start">
          <Tag tone={ticketStatusTones[ticket.status]}>
            {messages.tickets.statuses[ticket.status]}
          </Tag>
          {isBlocked(ticket, byId) ? <Tag tone="red">{messages.tickets.feed.blocked}</Tag> : null}
        </Stack>
      ),
    },
    {
      id: "project",
      label: messages.tickets.feed.columns.project,
      width: pixels(ticketColumnWidths.project),
      render: (ticket) => projectNames[ticket.project] ?? ticket.project,
    },
    {
      id: "assignee",
      label: messages.tickets.feed.columns.assignee,
      width: pixels(ticketColumnWidths.assignee),
      className: styles.assigneeCell,
      render: (ticket) => (ticket.assignee ? <AssigneeAvatar person={ticket.assignee} /> : null),
    },
  ];

  return (
    <article className={styles.tracker}>
      <Table
        minWidth={ticketsTableMinWidth}
        columns={columns}
        items={tickets}
        rowKey={(ticket) => ticket.key}
        rowClassName={() => styles.ticketRow}
        rowAttribute={TICKETS_ROW_ATTR}
        selected={(ticket) => ticket.key === currentKey}
        highlightFocusedRow
        label={label}
      />
    </article>
  );
}

function AssigneeAvatar({ person }: { person: { user: string; avatar?: string } }) {
  const identity = useMemberIdentity(person);
  return (
    <span role="img" aria-label={identity.username}>
      <MemberAvatar person={person} size="sm" />
    </span>
  );
}
