// The inbox's contract: the only surface other features import. It is a
// manifest, not an implementation: explicit re-exports of the slice's
// internals, nothing else. Only leaves without cross-feature imports live
// here — pages that read other contracts stay out, or the barrel would loop
// the slice graph (see AGENTS.md). The contract test pins the published list.
//
// Task 09 (section events → inbox) is the consumer: it builds InboxEvent
// values and posts them with enqueueInboxEvent. The rest of the model and the
// store stay internal — the inbox UI owns read and delete actions.

export { enqueueInboxEvent } from "../inbox-store";
export {
  buildMentionEvents,
  mentionExcerpt,
  mentionRedactedBody,
  mentionSubject,
} from "../mention-events";
export type { MentionDelivery, MentionEventInput } from "../mention-events";
export {
  buildApplicationDecisionEvents,
  buildApplicationRespondedEvents,
  buildApplicationSubmittedEvents,
  buildModerationDecisionEvents,
  buildMaintainerLostEvents,
  buildProjectDecisionEvents,
  buildProjectRespondedEvents,
  buildProjectSubmittedEvents,
  buildReadroomOpenedEvents,
  buildReadroomReportEvents,
  buildReplyEvents,
  buildTeamEvents,
  buildTicketAssignEvents,
  buildTicketCommentEvents,
  buildTicketCreatedEvents,
  buildTicketStallEvents,
  buildTicketStatusEvents,
  sectionEventId,
  uniqueEventRecipients,
} from "../section-events";
export type {
  ApplicationDecisionEventInput,
  ApplicationRespondedEventInput,
  ApplicationSubmittedEventInput,
  MaintainerLostEventInput,
  ModerationDecisionEventInput,
  ProjectDecisionEventInput,
  ProjectRespondedEventInput,
  ProjectSubmittedEventInput,
  ReadroomOpenedEventInput,
  ReadroomReportEventInput,
  ReplyEventInput,
  SectionDelivery,
  TeamEventInput,
  TicketAssignEventInput,
  TicketCommentEventInput,
  TicketCreatedEventInput,
  TicketStallEventInput,
  TicketStatusEventInput,
} from "../section-events";
export type { NotifyMentionsInput } from "../useMentionNotifier";
export { useMentionNotifier } from "../useMentionNotifier";
export type {
  InboxEvent,
  InboxKind,
  InboxNotification,
  InboxTarget,
  InboxTargetKind,
} from "../inbox";
