import { messages } from "@/content/messages";
import type { InboxEvent, InboxKind, InboxTarget } from "./inbox";

// Section events (task 09): the generalized inbox seam. Mentions were the
// first producer; every section below posts the same InboxEvent shape from a
// saved mock action — never from a render — with one stable id per entity
// and recipient, so replays, rerenders and repeated reads never double-deliver
// (the store drops repeats of the same id, like mentionEventId does).

const copy = messages.inbox.events;

export type SectionDelivery = {
  user: string;
  event: InboxEvent;
};

type SectionEventBase = {
  entityId: string;
  actorUser: string | null;
  recipients: readonly (string | null | undefined)[];
  source: string;
  subject: string;
  body: string;
  target: InboxTarget;
  kind: InboxKind;
  at: string;
};

/** Stable id per entity and recipient: `reply:<postId>:<user>`. */
export function sectionEventId(kind: string, entityId: string, user: string): string {
  return `${kind}:${entityId}:${user}`;
}

/**
 * One recipient per user, no self-notices, no blanks, no double delivery to
 * someone matching by several grounds. Joining/leaving a team changes the
 * future recipient set at the call site (callers pass the live roster), so a
 * muted or departed member simply stops appearing here; assigned tasks and
 * roles are separate facts and never disappear because of it.
 */
export function uniqueEventRecipients(
  candidates: readonly (string | null | undefined)[],
  exclude: string | null,
): string[] {
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    if (exclude !== null && candidate === exclude) continue;
    if (seen.has(candidate)) continue;
    seen.add(candidate);
  }
  return [...seen];
}

function buildSectionEvents(input: SectionEventBase): SectionDelivery[] {
  const users = uniqueEventRecipients(input.recipients, input.actorUser);
  return users.map((user) => ({
    user,
    event: {
      id: sectionEventId(input.kind, input.entityId, user),
      kind: input.kind,
      source: input.source,
      subject: input.subject,
      body: input.body,
      at: input.at,
      target: input.target,
    },
  }));
}

export type ReplyEventInput = {
  postId: string;
  threadTitle: string;
  boardLabel: string;
  actorUser: string | null;
  actorName: string;
  threadAuthor: string | null | undefined;
  parentAuthor: string | null | undefined;
  target: InboxTarget;
  at: string;
};

/** A board reply notifies the thread author and the answered post's author. */
export function buildReplyEvents(input: ReplyEventInput): SectionDelivery[] {
  return buildSectionEvents({
    entityId: input.postId,
    actorUser: input.actorUser,
    recipients: [input.threadAuthor, input.parentAuthor],
    source: input.boardLabel,
    subject: `${input.actorName} ${copy.replySubject} ${input.threadTitle}`,
    body: input.threadTitle,
    target: input.target,
    kind: "reply",
    at: input.at,
  });
}

export type TicketCommentEventInput = {
  commentId: string;
  ticketKey: string;
  projectLabel: string;
  actorUser: string | null;
  actorName: string;
  ticketAuthor: string | null | undefined;
  assignee: string | null | undefined;
  priorCommenters: readonly (string | null | undefined)[];
  target: InboxTarget;
  at: string;
};

/** A ticket comment notifies the author, the assignee and earlier voices. */
export function buildTicketCommentEvents(input: TicketCommentEventInput): SectionDelivery[] {
  return buildSectionEvents({
    entityId: input.commentId,
    actorUser: input.actorUser,
    recipients: [input.ticketAuthor, input.assignee, ...input.priorCommenters],
    source: input.projectLabel,
    subject: `${input.actorName} ${copy.ticketCommentSubject} ${input.ticketKey}`,
    body: input.ticketKey,
    target: input.target,
    kind: "ticket",
    at: input.at,
  });
}

/** A new task notifies the project leads so the queue stays watched. */
export type TicketCreatedEventInput = {
  ticketId: string;
  ticketKey: string;
  projectLabel: string;
  actorUser: string | null;
  actorName: string;
  leadsAndMaintainers: readonly (string | null | undefined)[];
  target: InboxTarget;
  at: string;
};

export function buildTicketCreatedEvents(input: TicketCreatedEventInput): SectionDelivery[] {
  return buildSectionEvents({
    entityId: `${input.ticketId}:created`,
    actorUser: input.actorUser,
    recipients: input.leadsAndMaintainers,
    source: input.projectLabel,
    subject: `${input.actorName} opened ${input.ticketKey}`,
    body: input.ticketKey,
    target: input.target,
    kind: "ticket",
    at: input.at,
  });
}

/** A quiet ticket pages its maintainers: assignments stall without a check-in. */
export type TicketStallEventInput = {
  ticketId: string;
  ticketKey: string;
  projectLabel: string;
  actorUser: string | null;
  maintainers: readonly (string | null | undefined)[];
  lead: string | null | undefined;
  target: InboxTarget;
  at: string;
};

export function buildTicketStallEvents(input: TicketStallEventInput): SectionDelivery[] {
  return buildSectionEvents({
    entityId: `${input.ticketId}:stall`,
    actorUser: input.actorUser,
    recipients: [...input.maintainers, input.lead],
    source: input.projectLabel,
    subject: `${input.ticketKey} ${copy.stallSubject}`,
    body: input.ticketKey,
    target: input.target,
    kind: "ticket",
    at: input.at,
  });
}

export type TicketStatusEventInput = {
  ticketId: string;
  ticketKey: string;
  from: string;
  to: string;
  projectLabel: string;
  actorUser: string | null;
  actorName: string;
  ticketAuthor: string | null | undefined;
  assignee: string | null | undefined;
  target: InboxTarget;
  at: string;
};

/** A status move notifies the ticket's author and its assignee. */
export function buildTicketStatusEvents(input: TicketStatusEventInput): SectionDelivery[] {
  return buildSectionEvents({
    entityId: `${input.ticketId}:status`,
    actorUser: input.actorUser,
    recipients: [input.ticketAuthor, input.assignee],
    source: input.projectLabel,
    subject: `${input.actorName} ${copy.ticketStatusSubject} ${input.ticketKey} ${copy.ticketStatusTo} ${input.to}`,
    body: `${input.ticketKey}: ${input.from} ${copy.ticketStatusTo} ${input.to}`,
    target: input.target,
    kind: "ticket",
    at: input.at,
  });
}

export type TicketAssignEventInput = {
  ticketId: string;
  ticketKey: string;
  projectLabel: string;
  actorUser: string | null;
  actorName: string;
  previousAssignee: string | null | undefined;
  nextAssignee: string | null | undefined;
  ticketAuthor: string | null | undefined;
  target: InboxTarget;
  at: string;
};

/** Assign/claim/leave notifies the author and both ends of the handover. */
export function buildTicketAssignEvents(input: TicketAssignEventInput): SectionDelivery[] {
  const joined =
    input.nextAssignee === undefined
      ? `${input.actorName} left ${input.ticketKey}`
      : `${input.actorName} ${copy.assignSubject} ${input.ticketKey}`;
  return buildSectionEvents({
    entityId: `${input.ticketId}:assign`,
    actorUser: input.actorUser,
    recipients: [input.ticketAuthor, input.previousAssignee, input.nextAssignee],
    source: input.projectLabel,
    subject: joined,
    body: input.ticketKey,
    target: input.target,
    kind: "ticket",
    at: input.at,
  });
}

export type ApplicationDecisionEventInput = {
  applicationId: string;
  decision: string;
  actorUser: string | null;
  actorName: string;
  applicant: string;
  target: InboxTarget;
  at: string;
};

export function buildApplicationDecisionEvents(
  input: ApplicationDecisionEventInput,
): SectionDelivery[] {
  return buildSectionEvents({
    entityId: `${input.applicationId}:${input.decision}`,
    actorUser: input.actorUser,
    recipients: [input.applicant],
    source: "ACCOUNT",
    subject: `${input.actorName} ${copy.applicationSubject}: ${input.decision}`,
    body: input.decision,
    target: input.target,
    kind: "application",
    at: input.at,
  });
}

export type ProjectDecisionEventInput = {
  proposalId: string;
  projectLabel: string;
  decision: string;
  actorUser: string | null;
  actorName: string;
  proposer: string;
  target: InboxTarget;
  at: string;
};
export function buildProjectDecisionEvents(input: ProjectDecisionEventInput): SectionDelivery[] {
  return buildSectionEvents({
    entityId: `${input.proposalId}:${input.decision}`,
    actorUser: input.actorUser,
    recipients: [input.proposer],
    source: input.projectLabel,
    subject: `${input.actorName} ${copy.projectSubject}: ${input.decision}`,
    body: input.decision,
    target: input.target,
    kind: "project",
    at: input.at,
  });
}

export type ApplicationSubmittedEventInput = {
  applicationId: string;
  applicant: string;
  applicantName: string;
  admins: readonly (string | null | undefined)[];
  target: InboxTarget;
  at: string;
};

/** A new Member application pages the admins from the saved submission. */
export function buildApplicationSubmittedEvents(
  input: ApplicationSubmittedEventInput,
): SectionDelivery[] {
  return buildSectionEvents({
    entityId: `${input.applicationId}:submitted`,
    actorUser: input.applicant,
    recipients: input.admins,
    source: "ACCOUNT",
    subject: `${input.applicantName} ${copy.applySubject}`,
    body: input.applicantName,
    target: input.target,
    kind: "application",
    at: input.at,
  });
}

export type ApplicationRespondedEventInput = {
  applicationId: string;
  applicant: string;
  applicantName: string;
  admins: readonly (string | null | undefined)[];
  target: InboxTarget;
  at: string;
};

/** The applicant answered a clarification: the queue reads fresh again. */
export function buildApplicationRespondedEvents(
  input: ApplicationRespondedEventInput,
): SectionDelivery[] {
  return buildSectionEvents({
    entityId: `${input.applicationId}:responded`,
    actorUser: input.applicant,
    recipients: input.admins,
    source: "ACCOUNT",
    subject: `${input.applicantName} ${copy.applyResponseSubject}`,
    body: input.applicantName,
    target: input.target,
    kind: "application",
    at: input.at,
  });
}

export type ProjectSubmittedEventInput = {
  proposalId: string;
  projectName: string;
  proposer: string;
  proposerName: string;
  admins: readonly (string | null | undefined)[];
  target: InboxTarget;
  at: string;
};

/** A new project proposal pages the admins from the saved submission. */
export function buildProjectSubmittedEvents(input: ProjectSubmittedEventInput): SectionDelivery[] {
  return buildSectionEvents({
    entityId: `${input.proposalId}:submitted`,
    actorUser: input.proposer,
    recipients: input.admins,
    source: input.projectName,
    subject: `${input.proposerName} ${copy.proposeSubject} ${input.projectName}`,
    body: input.projectName,
    target: input.target,
    kind: "project",
    at: input.at,
  });
}

export type ProjectRespondedEventInput = {
  proposalId: string;
  projectName: string;
  proposer: string;
  proposerName: string;
  admins: readonly (string | null | undefined)[];
  target: InboxTarget;
  at: string;
};

export function buildProjectRespondedEvents(input: ProjectRespondedEventInput): SectionDelivery[] {
  return buildSectionEvents({
    entityId: `${input.proposalId}:responded`,
    actorUser: input.proposer,
    recipients: input.admins,
    source: input.projectName,
    subject: `${input.proposerName} ${copy.proposeResponseSubject} ${input.projectName}`,
    body: input.projectName,
    target: input.target,
    kind: "project",
    at: input.at,
  });
}

export type TeamEventInput = {
  projectSlug: string;
  projectLabel: string;
  action: "join" | "leave" | "role";
  actorUser: string | null;
  actorName: string;
  affected: string | null | undefined;
  leadsAndMaintainers: readonly (string | null | undefined)[];
  target: InboxTarget;
  at: string;
};

/**
 * Team membership informs the leads/maintainers about joins and leaves, and
 * the affected member about a role change. The caller passes the live roster,
 * so leaving stops future team mail without touching tasks or roles. The
 * actor never self-notifies: their own action already answers in the UI.
 */
export function buildTeamEvents(input: TeamEventInput): SectionDelivery[] {
  const verb =
    input.action === "join"
      ? copy.teamJoinSubject
      : input.action === "leave"
        ? copy.teamLeaveSubject
        : copy.teamRoleSubject;
  const teamRecipients =
    input.action === "role" ? [input.affected] : [...input.leadsAndMaintainers, input.affected];
  return buildSectionEvents({
    entityId: `${input.projectSlug}:${input.action}:${input.affected ?? input.actorUser ?? "unknown"}`,
    actorUser: input.actorUser,
    recipients: teamRecipients,
    source: input.projectLabel,
    subject: `${input.actorName} ${verb} ${input.projectLabel}`,
    body: input.projectLabel,
    target: input.target,
    kind: "team",
    at: input.at,
  });
}

export type ReadroomReportEventInput = {
  readroomId: string;
  taskTitle: string;
  actorUser: string | null;
  actorName: string;
  noteAuthors: readonly (string | null | undefined)[];
  target: InboxTarget;
  at: string;
};

/** A published write-up notifies everyone who left a note. Open text. */
export function buildReadroomReportEvents(input: ReadroomReportEventInput): SectionDelivery[] {
  return buildSectionEvents({
    entityId: `${input.readroomId}:report`,
    actorUser: input.actorUser,
    recipients: input.noteAuthors,
    source: "READROOM",
    subject: `${input.actorName} ${copy.reportSubject} ${input.taskTitle}`,
    body: input.taskTitle,
    target: input.target,
    kind: "readroom",
    at: input.at,
  });
}

export type ReadroomOpenedEventInput = {
  readroomId: string;
  taskTitle: string;
  noteAuthors: readonly (string | null | undefined)[];
  target: InboxTarget;
  at: string;
};

/**
 * The deadline crossing opens every note exactly once per mock session: the
 * caller fires this from the deadline action (not from a render), and the
 * stable id keeps a repeated crossing from re-delivering. No note text or
 * preview travels before the deadline — the notice names the task only.
 */
export function buildReadroomOpenedEvents(input: ReadroomOpenedEventInput): SectionDelivery[] {
  return buildSectionEvents({
    entityId: `${input.readroomId}:opened`,
    actorUser: null,
    recipients: input.noteAuthors,
    source: "READROOM",
    subject: `${copy.notesOpenedSubject} ${input.taskTitle}`,
    body: input.taskTitle,
    target: input.target,
    kind: "readroom",
    at: input.at,
  });
}

/** The last Maintainer is gone: assignments pause until an admin names one. */
export type MaintainerLostEventInput = {
  projectSlug: string;
  projectLabel: string;
  actorUser: string | null;
  actorName: string;
  admins: readonly (string | null | undefined)[];
  target: InboxTarget;
  at: string;
};

export function buildMaintainerLostEvents(input: MaintainerLostEventInput): SectionDelivery[] {
  return buildSectionEvents({
    entityId: `${input.projectSlug}:no-maintainer`,
    actorUser: input.actorUser,
    recipients: input.admins,
    source: input.projectLabel,
    subject: `${input.projectLabel} lost its last Maintainer`,
    body: "New assignments are paused until admin names a Maintainer.",
    target: input.target,
    kind: "project",
    at: input.at,
  });
}

export type ModerationDecisionEventInput = {
  reportId: string;
  outcome: string;
  actorUser: string | null;
  actorName: string;
  reporters: readonly (string | null | undefined)[];
  targetAuthor: string | null | undefined;
  targetLabel: string;
  target: InboxTarget;
  at: string;
};

export function buildModerationDecisionEvents(
  input: ModerationDecisionEventInput,
): SectionDelivery[] {
  return buildSectionEvents({
    entityId: `${input.reportId}:${input.outcome}`,
    actorUser: input.actorUser,
    recipients: [...input.reporters, input.targetAuthor],
    source: "ACCOUNT",
    subject: `${input.actorName} ${copy.moderationSubject} ${input.targetLabel}: ${input.outcome}`,
    body: input.targetLabel,
    target: input.target,
    kind: "review",
    at: input.at,
  });
}
