"use client";

import type { MouseEvent } from "react";
import { Card, Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { formatAge } from "@/shared/age";
import { LeadLink } from "./LeadLink";
import { phaseOf, phaseTones, readroomPath, ticketPath, type Readroom } from "./readrooms";
import styles from "./readroom.module.css";

export const readroomCardId = (id: string) => `readroom-card-${id}`;

export type ReadroomCardProps = {
  readroom: Readroom;
  now: string;
  current?: boolean;
  onActivate: (event?: MouseEvent<HTMLElement>) => void;
};

export function ReadroomCard({ readroom, now, current = false, onActivate }: ReadroomCardProps) {
  const phase = phaseOf(readroom, now);

  return (
    <Card
      id={readroomCardId(readroom.id)}
      title={readroom.title}
      className={styles.cardTitle}
      current={current}
      href={readroomPath(readroom.id)}
      onActivate={onActivate}
      metaPosition="before"
      metaInteractive
      meta={
        <Stack direction="row" gap={6} align="center" wrap>
          <LeadLink lead={readroom.lead} />
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
          <Text as="span" role="hint">
            {readroom.codeRef}
          </Text>
        </Stack>
      }
    />
  );
}
