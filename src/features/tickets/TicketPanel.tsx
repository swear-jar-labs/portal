"use client";

import { useMemo } from "react";
import { Button, Heading, Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MemberLink } from "@/features/members/contracts";
import { projectPath } from "@/features/projects/contracts";
import { type ReadroomRef } from "@/features/readroom/contracts";
import { useShellSession } from "@/features/shell";
import { Markdown } from "@/shared/Markdown/Markdown";
import { formatAge } from "@/shared/age";
import { TicketBlockedSection } from "./TicketBlockedSection";
import { TicketCommentForm } from "./TicketCommentForm";
import { TicketCommentItem } from "./TicketCommentItem";
import { TicketLinksSection } from "./TicketLinksSection";
import * as ticketStore from "./ticket-store";
import { useMergedTickets, useTicketState } from "./useTicketSession";
import {
  TICKETS_PATH,
  isBlocked,
  openBlockers,
  ticketEditButtonId,
  ticketPriorityTones,
  ticketStatusTones,
  ticketTagTones,
  ticketsById,
  type Ticket,
} from "./tickets";
import styles from "./tickets.module.css";

export type TicketPanelProps = {
  ticket: Ticket;
  // The whole queue: the blocker chips resolve against it and the cycle guard
  // walks it. The fixture list; session edits are merged inside.
  tickets: readonly Ticket[];
  projectName: string;
  // The project's maintainers: they edit the ticket together with its author.
  maintainers: readonly string[];
  // The reverse list: readrooms reading this ticket's code (readroom-ticket-links).
  readrooms: readonly ReadroomRef[];
  now: string;
  // The edit layer lives in the stack (the panel only asks for it).
  onEdit: (ticket: Ticket) => void;
};

/** The live dossier: status, assignee, blockers and comments read the session
 * store, so an action repaints them without a round trip. The static parts
 * (title, body, links, readrooms) come with the RSC payload. */
export function TicketPanel({
  ticket,
  tickets,
  projectName,
  maintainers,
  readrooms,
  now,
  onEdit,
}: TicketPanelProps) {
  const session = useShellSession();
  const state = useTicketState();
  const live = ticketStore.withSessionState(ticket, state);
  const all = useMergedTickets(tickets);
  const byId = useMemo(() => ticketsById(all), [all]);
  const blocked = isBlocked(live, byId);
  const openKeys = openBlockers(live, byId).map((blocker) => blocker.key);
  // The author and the project's maintainers edit the ticket (Phase 5 keeps the
  // rule server-side and narrows the maintainer's fields).
  const canEdit =
    session !== null && (session.user === live.author.user || maintainers.includes(session.user));

  return (
    <Stack gap={12}>
      <Heading level={1}>{live.title}</Heading>
      <Text role="hint">{live.key}</Text>

      <Stack gap={4}>
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.project}
          </Text>
          <Link href={projectPath(live.project)}>{projectName}</Link>
        </Stack>
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.author}
          </Text>
          <MemberLink person={live.author} sectionPath={TICKETS_PATH} />
        </Stack>
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.assignee}
          </Text>
          {live.assignee ? (
            <MemberLink person={live.assignee} sectionPath={TICKETS_PATH} />
          ) : (
            <Text as="span" role="hint">
              {messages.tickets.feed.unassigned}
            </Text>
          )}
        </Stack>
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.status}
          </Text>
          <Tag tone={ticketStatusTones[live.status]}>{messages.tickets.statuses[live.status]}</Tag>
        </Stack>
        {blocked ? (
          <Text role="hint">
            {messages.tickets.dossier.blocked.startHint} {openKeys.join(", ")}
          </Text>
        ) : null}
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.size}
          </Text>
          <Tag>{live.size}</Tag>
        </Stack>
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.priority}
          </Text>
          <Tag tone={ticketPriorityTones[live.priority]}>
            {messages.tickets.priorities[live.priority]}
          </Tag>
        </Stack>
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.created}
          </Text>
          <Text as="span">{formatAge(live.createdAt, now, messages.tickets.age)}</Text>
          <Text as="span" role="hint">
            {messages.tickets.dossier.updated}
          </Text>
          <Text as="span">{formatAge(live.updatedAt, now, messages.tickets.age)}</Text>
          {live.closedAt === undefined ? null : (
            <>
              <Text as="span" role="hint">
                {messages.tickets.dossier.closed}
              </Text>
              <Text as="span">{formatAge(live.closedAt, now, messages.tickets.age)}</Text>
            </>
          )}
        </Stack>
        {live.tags.length === 0 ? null : (
          <Stack direction="row" gap={6} align="center" wrap navRow>
            <Text as="span" role="hint">
              {messages.tickets.dossier.tags}
            </Text>
            {live.tags.map((tag) => (
              <Tag key={tag} tone={ticketTagTones[tag]}>
                {messages.tickets.tags[tag]}
              </Tag>
            ))}
          </Stack>
        )}
      </Stack>

      {canEdit ? (
        <Stack navRow>
          <Button id={ticketEditButtonId} onClick={() => onEdit(live)}>
            {messages.tickets.dossier.edit}
          </Button>
        </Stack>
      ) : null}

      <TicketBlockedSection ticket={live} tickets={all} />

      <div className={styles.body}>
        <Markdown>{live.body}</Markdown>
      </div>

      <Stack gap={4}>
        <Heading level={2}>{messages.tickets.dossier.links.heading}</Heading>
        <TicketLinksSection ticketId={ticket.id} initialLinks={ticket.links} />
      </Stack>

      <Stack gap={6}>
        <Heading level={2}>
          {messages.tickets.dossier.comments.heading} · {live.comments.length}
        </Heading>
        {live.comments.length === 0 ? (
          <Text role="hint">{messages.tickets.dossier.comments.empty}</Text>
        ) : (
          <Stack gap={6}>
            {live.comments.map((entry) => (
              <TicketCommentItem
                key={entry.id}
                ticketId={live.id}
                comment={entry}
                now={now}
                canEdit={session?.user === entry.author.user}
              />
            ))}
          </Stack>
        )}
        <TicketCommentForm ticketId={live.id} />
      </Stack>

      <Stack gap={4}>
        <Heading level={2}>{messages.tickets.dossier.readrooms.heading}</Heading>
        {readrooms.length === 0 ? (
          <Text role="hint">{messages.tickets.dossier.readrooms.empty}</Text>
        ) : (
          <Stack gap={4}>
            {readrooms.map((entry) => (
              <Stack key={entry.id} navRow>
                <Link href={entry.path}>{entry.title}</Link>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
