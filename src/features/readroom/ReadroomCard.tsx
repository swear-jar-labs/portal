"use client";

import type { MouseEvent } from "react";
import { Card, FileIcon, Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { formatAge } from "@/shared/age";
import { MemberLink } from "@/features/members/contracts";
import { useOverlayPush } from "@/features/shell";
import { VoteButton } from "@/features/board/contracts";
import { ticketPath } from "@/features/tickets/contracts";
import {
  phaseOf,
  phaseTones,
  readroomCardTicketId,
  readroomPath,
  type Readroom,
} from "./readrooms";
import styles from "./readroom.module.css";

export const readroomCardId = (id: string) => `readroom-card-${id}`;

export type ReadroomCardProps = {
  readroom: Readroom;
  now: string;
  current?: boolean;
  // A task composed in this session has no route: its card activates in place
  // instead of linking to a page that does not exist.
  local?: boolean;
  // The session's vote on this task (one per account, withdrawable).
  voted: boolean;
  onVote: () => void;
  onActivate: (event?: MouseEvent<HTMLElement>) => void;
};

export function ReadroomCard({
  readroom,
  now,
  current = false,
  local = false,
  voted,
  onVote,
  onActivate,
}: ReadroomCardProps) {
  const phase = phaseOf(readroom, now);
  const openOverlay = useOverlayPush();
  // A composed task has no route: the card activates in place (the title is a
  // button, so a context menu or drag cannot open a page that does not exist).
  const activation = local ? { onActivate } : { href: readroomPath(readroom.id), onActivate };

  return (
    <Card
      id={readroomCardId(readroom.id)}
      title={readroom.title}
      className={styles.cardTitle}
      current={current}
      {...activation}
      leading={
        <Stack direction="row" gap={6} align="center">
          <FileIcon kind="exe" icon="book" />
        </Stack>
      }
      metaPosition="before"
      metaInteractive
      meta={
        <Stack direction="row" gap={6} align="center" wrap>
          <MemberLink person={readroom.lead} />
          <Text as="span" role="hint">
            {[
              formatAge(readroom.createdAt, now, messages.readroom.age),
              formatCount(readroom.notes.length, pluralForms.note),
            ].join(" · ")}
          </Text>
        </Stack>
      }
      actions={
        <Stack direction="row" gap={6} align="center" wrap className={styles.cardDetails}>
          <Tag tone={phaseTones[phase]}>{messages.readroom.phases[phase]}</Tag>
          {readroom.ticket === undefined ? null : (
            <Link
              id={readroomCardTicketId(readroom.id)}
              href={ticketPath(readroom.ticket)}
              className={styles.ticket}
              onClick={openOverlay(ticketPath(readroom.ticket), readroomCardTicketId(readroom.id))}
            >
              <Tag>{`${messages.readroom.task.ticket} #${readroom.ticket}`}</Tag>
            </Link>
          )}
          {readroom.tags.map((tag) => (
            <Tag key={tag}>{messages.readroom.tags[tag]}</Tag>
          ))}
          <VoteButton votes={readroom.upvotes.length} voted={voted} onToggle={onVote} />
        </Stack>
      }
    />
  );
}
