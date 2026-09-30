import { messages } from "@/content/messages";
import {
  mentionEventId,
  mentionRecipients,
  stripMentionCode,
  type MentionDirectory,
} from "@/shared/mentions";
import type { InboxEvent, InboxTarget } from "./inbox";

// The mention producer: the first client of the section-events inbox seam
// (task 09 generalizes it). Events are built from a saved message — never from
// a render — with one stable id per message and recipient, so reposts,
// rerenders and edits that keep the tag never double-deliver.

const MENTION_EXCERPT_MAX_LENGTH = 160;

export type MentionEventInput = {
  // The message carrying the tags: a post, comment, note, report or task id.
  messageId: string;
  body: string;
  authorUser: string;
  directory: MentionDirectory;
  // The originating surface label (a board name, a project name, READROOM).
  source: string;
  // Display names for the subject line: the author's and the message's.
  mentioner: string;
  context: string;
  // A short quote of the message. Omit it when the recipient must not see the
  // text (a readroom note before its deadline): the notice stays generic.
  excerpt?: string;
  target: InboxTarget;
  at: string;
};

export type MentionDelivery = {
  user: string;
  event: InboxEvent;
};

/** A readable one-liner of the message: code stripped, whitespace folded. */
export function mentionExcerpt(body: string): string {
  const folded = stripMentionCode(body).replace(/\s+/g, " ").trim();
  return folded.length <= MENTION_EXCERPT_MAX_LENGTH
    ? folded
    : `${folded.slice(0, MENTION_EXCERPT_MAX_LENGTH - 1).trimEnd()}…`;
}

export function mentionSubject(mentioner: string, context: string): string {
  return `${mentioner} ${messages.inbox.mention.subjectMentioned} ${context}`;
}

export function mentionRedactedBody(mentioner: string): string {
  return `${mentioner} ${messages.inbox.mention.redactedMentioned} ${messages.inbox.mention.redactedOpen}`;
}

export function buildMentionEvents(input: MentionEventInput): MentionDelivery[] {
  const { messageId, body, authorUser, directory, source, target, at } = input;
  const excerpt = input.excerpt ?? mentionExcerpt(body);
  return mentionRecipients({ body, authorUser, directory }).map((user) => ({
    user,
    event: {
      id: mentionEventId(messageId, user),
      kind: "mention",
      source,
      subject: mentionSubject(input.mentioner, input.context),
      body: excerpt,
      at,
      target,
      available: true,
    },
  }));
}
