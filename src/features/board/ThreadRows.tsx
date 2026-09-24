"use client";

import type { MouseEvent } from "react";
import { Card, Stack, Tag, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { useOverlayPush } from "@/features/shell";
import { MemberLink } from "@/features/members/contracts";
import { boardTitle, formatAge, tagTones, threadPath, type ThreadSummary } from "./threads";
import { threadCardId } from "./ThreadCard";
import styles from "./board.module.css";

type ThreadRowsProps = {
  threads: readonly ThreadSummary[];
  now: string;
};

/** A member's threads: read-only rows that open the board's thread panel
 * as an overlay layer through a plain SPA push (modified clicks keep the
 * native tab behavior). Rows read like the feed's cards (byline first, black
 * titles): the vote button stays where the board's session store lives, and
 * the byline is the shared MemberLink. */
export function ThreadRows({ threads, now }: ThreadRowsProps) {
  const pushOverlay = useOverlayPush();

  const activate = (thread: ThreadSummary) => (event?: MouseEvent<HTMLElement>) => {
    // The profile stays mounted under the root-slot intercept, so the row
    // card is a valid focus target when the overlay peels.
    pushOverlay(threadPath(thread.id), threadCardId(thread.id))(event);
  };

  return (
    <Stack gap={8}>
      {threads.map((thread) => (
        <Card
          key={thread.id}
          id={threadCardId(thread.id)}
          title={thread.title}
          href={threadPath(thread.id)}
          onActivate={activate(thread)}
          className={styles.cardTitle}
          leading={
            thread.pinned || thread.locked ? (
              <Stack direction="row" gap={6}>
                {thread.pinned ? (
                  <Text as="span" role="accent">
                    {messages.board.card.pinned}
                  </Text>
                ) : null}
                {thread.locked ? (
                  <Text as="span" role="danger">
                    {messages.board.card.locked}
                  </Text>
                ) : null}
              </Stack>
            ) : undefined
          }
          metaPosition="before"
          metaInteractive
          meta={
            <Stack direction="row" gap={6} align="center" wrap>
              <MemberLink person={thread.author} />
              <Text as="span" role="hint">
                {[
                  boardTitle(thread.board),
                  formatAge(thread.lastActivityAt, now),
                  formatCount(thread.votes, pluralForms.vote),
                  formatCount(thread.replies, pluralForms.reply),
                ].join(" · ")}
              </Text>
            </Stack>
          }
          actions={
            thread.tags.length === 0 ? null : (
              <Stack direction="row" gap={4} wrap>
                {thread.tags.map((tag) => (
                  <Tag key={tag} tone={tagTones[tag]}>
                    {messages.board.tags[tag]}
                  </Tag>
                ))}
              </Stack>
            )
          }
        />
      ))}
    </Stack>
  );
}
