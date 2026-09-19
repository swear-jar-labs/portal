"use client";

import type { ReactNode } from "react";
import { Heading, Stack, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { useShellSession } from "@/features/shell";
import { formatAge } from "@/shared/age";
import { phaseOf, READROOM_CARD_ATTR, visibleNotes, type Readroom } from "./readrooms";
import { ReadroomMemberLink } from "./ReadroomMemberLink";
import styles from "./readroom.module.css";

export type ReadroomViewProps = {
  readroom: Readroom;
  now: string;
  // Markdown bodies of the notes, rendered in RSC and keyed by note id.
  noteBodies: Record<string, ReactNode>;
  report?: ReactNode;
};

/** The task's interactive half: notes visibility follows the session and the
 * deadline (READROOM.md §5), the report closes the task. */
export function ReadroomView({ readroom, now, noteBodies, report }: ReadroomViewProps) {
  const session = useShellSession();
  const phase = phaseOf(readroom, now);
  const { notes, sealed } = visibleNotes(readroom, now, session?.user ?? null);

  return (
    <Stack gap={12}>
      <Stack gap={6}>
        <Heading level={2}>{messages.readroom.notes.heading}</Heading>

        {notes.length === 0 ? (
          sealed === 0 ? (
            <Text role="hint">{messages.readroom.notes.empty}</Text>
          ) : null
        ) : (
          notes.map((note) => (
            <div key={note.id} className={styles.note} {...{ [READROOM_CARD_ATTR]: "" }}>
              <Stack gap={4}>
                <Stack direction="row" gap={6} align="center" wrap>
                  <ReadroomMemberLink person={note.author} avatarSize="sm" />
                  {session?.user === note.author.user ? (
                    <Text as="span" role="accent">
                      {messages.readroom.notes.yours}
                    </Text>
                  ) : null}
                  <Text as="span" role="hint">
                    {formatAge(note.createdAt, now, messages.readroom.age)}
                  </Text>
                </Stack>
                {noteBodies[note.id]}
              </Stack>
            </div>
          ))
        )}

        {sealed > 0 ? (
          <Text role="hint">
            {`${formatCount(sealed, pluralForms.note)} ${messages.readroom.notes.sealed}`}
          </Text>
        ) : null}
      </Stack>

      {report === undefined ? (
        phase === "reviewing" ? (
          <Text role="hint">{messages.readroom.report.inProgress}</Text>
        ) : phase === "archived" ? (
          <Text role="hint">{messages.readroom.report.stopped}</Text>
        ) : null
      ) : (
        <Stack gap={6}>
          <Heading level={2}>{messages.readroom.report.heading}</Heading>
          <div className={styles.report} {...{ [READROOM_CARD_ATTR]: "" }}>
            {report}
          </div>
        </Stack>
      )}
    </Stack>
  );
}
