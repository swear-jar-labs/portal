"use client";

import { useMemo, useState } from "react";
import { Button, Heading, Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { MemberLink } from "@/features/members/contracts";
import { projectPath, type ClaimPolicy } from "@/features/projects/contracts";
import { type ReadroomRef } from "@/features/readroom/contracts";
import { useLoginPrompt, useShellSession } from "@/features/shell";
import { plural } from "@/lib/plural";
import { Markdown } from "@/shared/Markdown/Markdown";
import { formatAge } from "@/shared/age";
import { avatarFor } from "@/shared/members";
import { TicketBlockedSection } from "./TicketBlockedSection";
import { TicketCommentForm } from "./TicketCommentForm";
import { TicketCommentItem } from "./TicketCommentItem";
import { TicketLinksSection } from "./TicketLinksSection";
import * as ticketStore from "./ticket-store";
import { useMergedTickets, useTicketState } from "./useTicketSession";
import { claimRefusal, countDoneBySize, ladderNeed } from "./claim";
import {
  TICKETS_PATH,
  isBlocked,
  openBlockers,
  ticketBlockedAddButtonId,
  ticketBlockedSectionId,
  ticketEditButtonId,
  ticketLinksAddButtonId,
  ticketLinksSectionId,
  ticketPriorityTones,
  ticketSizeTones,
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
  // The project's maintainers: they open the edit layer together with the
  // author and the assignee; the layer narrows the fields by seat.
  maintainers: readonly string[];
  assignmentsPaused: boolean;
  // The project's claim ladder (RULES §15): ASSIGN TO ME gates on it.
  claimPolicy: ClaimPolicy;
  // The reverse list: readrooms reading this ticket's code (readroom-ticket-links).
  readrooms: readonly ReadroomRef[];
  now: string;
  // The edit layer lives in the stack (the panel only asks for it).
  onEdit: (ticket: Ticket) => void;
};

// The forms open from the action row above their sections (the links form sits
// below the body): scroll on every click, not on state change — clicking an
// already-open form must answer too. Nearest keeps the row put when visible.
function revealSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: "nearest" });
}

/** The live dossier: status, assignee, blockers and comments read the session
 * store, so an action repaints them without a round trip. The static parts
 * (title, body, links, readrooms) come with the RSC payload. */
export function TicketPanel({
  ticket,
  tickets,
  projectName,
  maintainers,
  assignmentsPaused,
  claimPolicy,
  readrooms,
  now,
  onEdit,
}: TicketPanelProps) {
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const state = useTicketState();
  const live = ticketStore.withSessionState(ticket, state);
  const all = useMergedTickets(tickets);
  const byId = useMemo(() => ticketsById(all), [all]);
  const blocked = isBlocked(live, byId);
  const openKeys = openBlockers(live, byId).map((blocker) => blocker.key);
  // The author, the assignee and the project's maintainers open the edit layer
  // (Phase 5 keeps the rule server-side); the layer itself narrows the fields
  // by seat.
  const canEdit =
    session !== null &&
    (session.user === live.author.user ||
      session.user === live.assignee?.user ||
      maintainers.includes(session.user));
  // Links and blockers take the wider crew: the author, the assignee and the
  // maintainers. Commenting stays open to every member.
  const canManageLinks =
    session !== null &&
    (session.user === live.author.user ||
      session.user === live.assignee?.user ||
      maintainers.includes(session.user));

  const [blockerComposing, setBlockerComposing] = useState(false);
  const [linkComposing, setLinkComposing] = useState(false);
  // A refused ASSIGN stays explained: the first failed click turns the hint red.
  const [refused, setRefused] = useState(false);

  const isMine = session !== null && session.user === live.assignee?.user;
  // The claim row lives only on open work: taking finished work is nonsense,
  // and leaving it would strip the assignee's done record (RULES §15 counts
  // done tickets by assignee).
  const openWork =
    live.status === "open" || live.status === "in_progress" || live.status === "review";
  const claimable = live.assignee === undefined && openWork;
  const canLeave = isMine && openWork;
  const record = session === null ? null : countDoneBySize(all, session.user);
  const refusal = record === null ? null : claimRefusal(claimPolicy, record, live.size);

  // The rung as a chip-led row: the size chip replaces the size word, N DONE
  // and EVERYONE read in magenta, the have-tail closes the sentence. The words
  // match the ABOUT ladder of the project.
  function claimRow() {
    const claim = messages.tickets.dossier.claim;
    const rung = ladderNeed(claimPolicy, live.size);
    const role = refused && refusal !== null ? "danger" : "hint";
    if (rung === null)
      return (
        <>
          <Tag tone={ticketSizeTones[live.size]}>{live.size}</Tag>
          <Text as="span" role={role}>{`${pluralForms.task.other} ${claim.available}`}</Text>
          <Text as="span" tone="magenta">
            {claim.everyone}
          </Text>
        </>
      );
    return (
      <>
        <Tag tone={ticketSizeTones[live.size]}>{live.size}</Tag>
        <Text as="span" role={role}>{`${pluralForms.task.other} ${claim.needs}`}</Text>
        <Text as="span" tone="magenta">{`${rung.need} ${claim.done}`}</Text>
        <Tag tone={ticketSizeTones[rung.needSize]}>{rung.needSize}</Tag>
        <Text as="span" role={role}>
          {record === null
            ? plural(rung.need, pluralForms.task)
            : `${plural(rung.need, pluralForms.task)} (${claim.have} ${record[rung.needSize]})`}
        </Text>
      </>
    );
  }

  function handleAssign() {
    if (assignmentsPaused) return;
    if (session === null) {
      requestLogin();
      return;
    }
    if (refusal !== null) {
      setRefused(true);
      return;
    }
    ticketStore.assignTicket(live.id, { user: session.user, avatar: avatarFor(session.user) });
  }

  function handleLeave() {
    ticketStore.leaveTicket(live.id);
  }

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
        {claimable ? (
          <Stack direction="row" gap={6} align="center" wrap navRow>
            {claimRow()}
          </Stack>
        ) : null}
        {claimable ? <Text role="hint">{messages.tickets.dossier.claim.timers}</Text> : null}
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
          <Tag tone={ticketSizeTones[live.size]}>{live.size}</Tag>
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

      {claimable && assignmentsPaused ? (
        <Text role="danger">{messages.projects.team.noMaintainer}</Text>
      ) : null}
      {claimable || canLeave ? (
        <Stack direction="row" gap={6} align="center" wrap navRow>
          {claimable ? (
            <Button onClick={handleAssign} disabled={assignmentsPaused}>
              {messages.tickets.dossier.claim.assign}
            </Button>
          ) : null}
          {canLeave ? (
            <Button onClick={handleLeave}>{messages.tickets.dossier.claim.leave}</Button>
          ) : null}
        </Stack>
      ) : null}

      {session !== null ? (
        <Stack direction="row" gap={6} align="center" wrap navRow>
          {canEdit ? (
            <Button id={ticketEditButtonId} onClick={() => onEdit(live)}>
              {messages.tickets.dossier.edit}
            </Button>
          ) : null}
          {canManageLinks ? (
            <Button
              id={ticketBlockedAddButtonId}
              onClick={() => {
                setBlockerComposing(true);
                revealSection(ticketBlockedSectionId);
              }}
            >
              {messages.tickets.dossier.blocked.add}
            </Button>
          ) : null}
          {canManageLinks ? (
            <Button
              id={ticketLinksAddButtonId}
              onClick={() => {
                setLinkComposing(true);
                revealSection(ticketLinksSectionId);
              }}
            >
              {messages.tickets.dossier.links.add}
            </Button>
          ) : null}
        </Stack>
      ) : null}

      <TicketBlockedSection
        ticket={live}
        tickets={all}
        composing={blockerComposing}
        onComposeChange={setBlockerComposing}
        canManage={canManageLinks}
      />

      <div className={styles.body}>
        <Markdown>{live.body}</Markdown>
      </div>

      <Stack gap={4} id={ticketLinksSectionId}>
        <Heading level={2}>{messages.tickets.dossier.links.heading}</Heading>
        <TicketLinksSection
          ticketId={ticket.id}
          initialLinks={ticket.links}
          composing={linkComposing}
          onComposeChange={setLinkComposing}
          canManage={canManageLinks}
        />
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
