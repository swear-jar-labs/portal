"use client";

import { useMemo } from "react";
import { Button, Heading, Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MemberLink } from "@/features/members/contracts";
import { projectPath } from "@/features/projects/contracts";
import { type ReadroomRef } from "@/features/readroom/contracts";
import { useLoginPrompt, useShellSession, type ShellSession } from "@/features/shell";
import { Markdown } from "@/shared/Markdown/Markdown";
import { formatAge } from "@/shared/age";
import { avatarFor } from "@/shared/members";
import { TicketBlockedSection } from "./TicketBlockedSection";
import { TicketCommentForm } from "./TicketCommentForm";
import { TicketCommentItem } from "./TicketCommentItem";
import { TicketLinksSection } from "./TicketLinksSection";
import * as ticketStore from "./ticket-store";
import { useMergedTickets, useTicketState } from "./useTicketSession";
import {
  TICKETS_PATH,
  canStart,
  isBlocked,
  openBlockers,
  ticketPriorities,
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
  // The reverse list: readrooms reading this ticket's code (readroom-ticket-links).
  readrooms: readonly ReadroomRef[];
  now: string;
};

/** The live dossier: status, assignee, blockers and comments read the session
 * store, so an action repaints them without a round trip. The static parts
 * (title, body, links, readrooms) come with the RSC payload. */
export function TicketPanel({ ticket, tickets, projectName, readrooms, now }: TicketPanelProps) {
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const state = useTicketState();
  const live = ticketStore.withSessionState(ticket, state);
  const all = useMergedTickets(tickets);
  const byId = useMemo(() => ticketsById(all), [all]);
  const blocked = isBlocked(live, byId);
  const openKeys = openBlockers(live, byId).map((blocker) => blocker.key);

  // A guest keeps the dossier and gets the login prompt (compose pattern).
  function run(action: (active: NonNullable<ShellSession>) => void) {
    if (session === null) {
      requestLogin();
      return;
    }
    action(session);
  }

  const terminal = live.status === "done" || live.status === "closed";

  return (
    <Stack gap={12}>
      <Stack direction="row" gap={8} align="center" wrap>
        <Heading level={1}>{live.title}</Heading>
        <Tag tone={ticketStatusTones[live.status]}>{messages.tickets.statuses[live.status]}</Tag>
        <Tag>{live.size}</Tag>
      </Stack>
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
        {/* The queue order: the active chip is the current priority (the
            maintainer's call in Phase 5; the mock lets any member set it). */}
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.priority}
          </Text>
          {ticketPriorities.map((priority) => (
            <Tag
              key={priority}
              tone={ticketPriorityTones[priority]}
              active={live.priority === priority}
              onClick={() => run(() => ticketStore.setTicketPriority(live.id, priority))}
            >
              {messages.tickets.priorities[priority]}
            </Tag>
          ))}
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

      {terminal ? null : (
        <Stack gap={4}>
          <Stack direction="row" gap={6} wrap navRow>
            {live.status === "open" ? (
              <Button
                variant="primary"
                disabled={!canStart(live, byId)}
                onClick={() =>
                  run((active) =>
                    ticketStore.startTicket(live.id, {
                      user: active.user,
                      avatar: avatarFor(active.user),
                    }),
                  )
                }
              >
                {messages.tickets.dossier.actions.start}
              </Button>
            ) : null}
            {live.status === "in_progress" ? (
              <Button onClick={() => run(() => ticketStore.sendTicketToReview(live.id))}>
                {messages.tickets.dossier.actions.review}
              </Button>
            ) : null}
            {live.status === "review" ? (
              <Button onClick={() => run(() => ticketStore.finishTicket(live.id))}>
                {messages.tickets.dossier.actions.done}
              </Button>
            ) : null}
            <Button
              ariaLabel={messages.tickets.dossier.actions.closeLabel}
              onClick={() => run(() => ticketStore.closeTicket(live.id))}
            >
              {messages.tickets.dossier.actions.close}
            </Button>
          </Stack>
          {blocked && live.status === "open" ? (
            <Text role="hint">
              {messages.tickets.dossier.blocked.startHint} {openKeys.join(", ")}
            </Text>
          ) : null}
        </Stack>
      )}

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
