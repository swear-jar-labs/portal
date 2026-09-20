"use client";

import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Card, Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { isPlainActivation } from "@/lib/activation";
import { formatCount } from "@/lib/format";
import { stackMemory } from "@/features/shell";
import { memberPath } from "@/shared/members";
import { boardTitle, formatAge, tagTones, threadPath, type ThreadSummary } from "./threads";
import styles from "./board.module.css";

type ThreadRowsProps = {
  threads: readonly ThreadSummary[];
  now: string;
};

/** A member's threads: read-only rows that open the board's thread panel
 * through a plain SPA push (modified clicks keep the native tab behavior).
 * Rows read like the feed's cards (byline first, black titles): the vote
 * button stays where the board's session store lives, and author links are
 * ordinary routes (no layer intercept — that memory belongs to the section
 * stacks). */
export function ThreadRows({ threads, now }: ThreadRowsProps) {
  const router = useRouter();

  const activate = (thread: ThreadSummary) => (event?: MouseEvent<HTMLElement>) => {
    if (!isPlainActivation(event)) return;
    event?.preventDefault();
    const route = threadPath(thread.id);
    // The board reads this memory on close: the pushed thread returns to the
    // profile with browser back, like a card in the feed returns to the feed.
    stackMemory.rememberPush(route);
    router.push(route);
  };

  return (
    <Stack gap={8}>
      {threads.map((thread) => (
        <Card
          key={thread.id}
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
              <Link href={memberPath(thread.author.user)}>
                <Avatar user={thread.author.user} src={thread.author.avatar} size="md" />
                <Text as="span">{thread.author.user}</Text>
              </Link>
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
