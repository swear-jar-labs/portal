"use client";

import { useEffect, useState } from "react";
import { Button, Heading, Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { MemberLink } from "@/features/members/contracts";
import { projectPath } from "@/features/projects/contracts";
import { type ReadroomRef } from "@/features/readroom/contracts";
import { useLoginPrompt, useOverlayPush, useShellSession } from "@/features/shell";
import { plural } from "@/lib/plural";
import { Markdown } from "@/shared/Markdown/Markdown";
import { formatAge } from "@/shared/age";
import { TicketBlockedSection } from "./TicketBlockedSection";
import { TicketCommentForm } from "./TicketCommentForm";
import { TicketCommentItem } from "./TicketCommentItem";
import { TicketLinksSection } from "./TicketLinksSection";
import * as ticketStore from "../data/ticket-store";
import { freshTicketAccess } from "../data/mock-ticket-access";
import { useMergedTickets, useTicketState } from "../data/useTicketSession";
import { countDoneBySize, ladderNeed } from "../model/claim";
import {
  ticketBlockedAddButtonId,
  ticketProjectLinkId,
  ticketBlockedSectionId,
  ticketEditButtonId,
  ticketLinksAddButtonId,
  ticketLinksSectionId,
  ticketPriorityTones,
  ticketSizeTones,
  ticketStatusTones,
  ticketTagTones,
  type Ticket,
} from "../model/tickets";
import styles from "../tickets.module.css";
import {
  canEditTicket,
  canManageTicketBlockers,
  canWriteTicket,
  isActiveTicket,
  isProjectManager,
  needsMaintainerCheckIn,
  type ClaimBlock,
  type TicketProject,
} from "../model/workflow";

const ACTIVITY_CLOCK_MS = 60_000;

export type TicketPanelProps = {
  ticket: Ticket;
  // The whole queue: the blocker chips resolve against it and the cycle guard
  // walks it. The fixture list; session edits are merged inside.
  tickets: readonly Ticket[];
  projectName: string;
  project: TicketProject;
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
  project,
  readrooms,
  now,
  onEdit,
}: TicketPanelProps) {
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const openOverlay = useOverlayPush();
  const state = useTicketState();
  const live = ticketStore.withSessionState(ticket, state);
  const all = useMergedTickets(tickets);
  const canEdit = canEditTicket(session, live, project);
  const canManageLinks = canEdit;
  const canManageBlockers = canManageTicketBlockers(session, project);
  const isManager = isProjectManager(session, project);

  const [blockerComposing, setBlockerComposing] = useState(false);
  const [linkComposing, setLinkComposing] = useState(false);
  // A refused ASSIGN stays explained: the first failed click turns the hint red.
  const [refused, setRefused] = useState<ClaimBlock | null>(null);
  const [clock, setClock] = useState(now);
  // The server `now` seeds the first paint; the client clock takes over on
  // mount so the check-in signal ticks on an open dossier.
  useEffect(() => {
    const update = () => setClock(new Date().toISOString());
    update();
    const timer = window.setInterval(update, ACTIVITY_CLOCK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const isMine = session !== null && session.user === live.assignee?.user;
  // The claim row lives only on open work: taking finished work is nonsense,
  // and leaving it would strip the assignee's done record (RULES §15 counts
  // done tickets by assignee).
  const openWork = isActiveTicket(live);
  const claimable = live.assignee === undefined && openWork;
  const canLeave = isMine && openWork;
  const record = session === null ? null : countDoneBySize(all, session.user);
  const checkIn = isManager && needsMaintainerCheckIn(live, clock);

  // The rung as a chip-led row: the size chip replaces the size word, N DONE
  // and EVERYONE read in magenta, the have-tail closes the sentence. The words
  // match the ABOUT ladder of the project.
  function claimRow() {
    const claim = messages.tickets.dossier.claim;
    const rung = ladderNeed(project.claimPolicy, live.size);
    const role = refused === "ladder" ? "danger" : "hint";
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

  async function handleAssign() {
    if (session === null) {
      requestLogin();
      return;
    }
    const access = await freshTicketAccess(live.project);
    if (!access || access.actor?.user !== session.user) {
      setRefused("member");
      return;
    }
    const checkedProject = { ...access.project, claimPolicy: project.claimPolicy };
    const denied = ticketStore.tryClaimTicket(live.id, access.actor, checkedProject, tickets);
    setRefused(denied);
  }

  async function handleLeave() {
    if (!session) return;
    const access = await freshTicketAccess(live.project);
    if (access?.actor?.user !== session.user || live.assignee?.user !== session.user) return;
    ticketStore.leaveTicket(live.id, session.user);
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
          <Link
            id={ticketProjectLinkId(live.project)}
            href={projectPath(live.project)}
            onClick={openOverlay(projectPath(live.project), ticketProjectLinkId(live.project))}
          >
            {projectName}
          </Link>
        </Stack>
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.author}
          </Text>
          <MemberLink person={live.author} />
        </Stack>
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.assignee}
          </Text>
          {live.assignee ? (
            <MemberLink person={live.assignee} />
          ) : (
            <Text as="span" role="hint">
              {messages.tickets.dossier.assigneeUnassigned}
            </Text>
          )}
        </Stack>
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.reviewer}
          </Text>
          {live.reviewer ? (
            <MemberLink person={live.reviewer} />
          ) : (
            <Text as="span" role="hint">
              {messages.tickets.dossier.reviewerUnassigned}
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
        {checkIn ? <Text role="danger">{messages.tickets.dossier.checkIn}</Text> : null}
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

      {claimable && project.maintainers.length === 0 ? (
        <Text role="danger">{messages.projects.team.noMaintainer}</Text>
      ) : null}
      {claimable && project.status === "archived" ? (
        <Text role="danger">{messages.tickets.dossier.claim.archived}</Text>
      ) : null}
      {refused && refused !== "ladder" ? (
        <Text role="danger">{messages.tickets.dossier.claim.errors[refused]}</Text>
      ) : null}
      {claimable || canLeave ? (
        <Stack direction="row" gap={6} align="center" wrap navRow>
          {claimable ? (
            <Button
              onClick={handleAssign}
              disabled={project.maintainers.length === 0 || project.status === "archived"}
            >
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
          {canManageBlockers ? (
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
        canManage={canManageBlockers}
        project={project}
      />

      <div className={styles.body}>
        <Markdown>{live.body}</Markdown>
      </div>

      <Stack gap={4} id={ticketLinksSectionId}>
        <Heading level={2}>{messages.tickets.dossier.links.heading}</Heading>
        <TicketLinksSection
          ticket={live}
          initialLinks={ticket.links}
          composing={linkComposing}
          onComposeChange={setLinkComposing}
          canManage={canManageLinks}
          project={project}
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
                ticket={live}
                project={project}
                comment={entry}
                now={now}
                canEdit={canWriteTicket(session, project) && session?.user === entry.author.user}
              />
            ))}
          </Stack>
        )}
        <TicketCommentForm ticket={live} project={project} />
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
