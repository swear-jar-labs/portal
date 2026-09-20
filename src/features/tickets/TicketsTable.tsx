import type { MouseEvent } from "react";
import { Avatar, Table, Tag, type TableColumn } from "@swearjar/dos";
import { messages } from "@/content/messages";
import {
  TICKETS_ROW_ATTR,
  ticketPath,
  ticketRowId,
  ticketStatusTones,
  type Ticket,
} from "./tickets";
import styles from "./tickets.module.css";

// The tight grid: every column is sized by its content (KEY fits the longest
// key, `CACHE-12345`; SIZE the header plus air; STATUS the `IN PROGRESS` tag).
// TITLE carries a floor only and stays flexible, so it absorbs the panel's
// spare width instead of inflating the narrow columns.
const ticketColumnWidths = {
  key: 112,
  title: 250,
  size: 48,
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
      render: (ticket) => ticket.size,
    },
    {
      id: "status",
      label: messages.tickets.feed.columns.status,
      width: pixels(ticketColumnWidths.status),
      render: (ticket) => (
        <Tag tone={ticketStatusTones[ticket.status]}>
          {messages.tickets.statuses[ticket.status]}
        </Tag>
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
      render: (ticket) =>
        ticket.assignee ? (
          <span role="img" aria-label={ticket.assignee.user}>
            <Avatar user={ticket.assignee.user} src={ticket.assignee.avatar} size="sm" />
          </span>
        ) : null,
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
