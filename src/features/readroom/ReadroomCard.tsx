"use client";

import type { MouseEvent } from "react";
import { Card, Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { formatAge } from "@/shared/age";
import { MemberLink } from "@/features/members/contracts";
import {
  phaseOf,
  phaseTones,
  readroomPath,
  READROOM_PATH,
  ticketPath,
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
  onActivate: (event?: MouseEvent<HTMLElement>) => void;
};

export function ReadroomCard({
  readroom,
  now,
  current = false,
  local = false,
  onActivate,
}: ReadroomCardProps) {
  const phase = phaseOf(readroom, now);
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
      metaPosition="before"
      metaInteractive
      meta={
        <Stack direction="row" gap={6} align="center" wrap>
          <MemberLink person={readroom.lead} sectionPath={READROOM_PATH} />
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
            <Link href={ticketPath(readroom.ticket)} className={styles.ticket}>
              <Tag>{`${messages.readroom.task.ticket} #${readroom.ticket}`}</Tag>
            </Link>
          )}
          {readroom.tags.map((tag) => (
            <Tag key={tag}>{messages.readroom.tags[tag]}</Tag>
          ))}
        </Stack>
      }
    />
  );
}
