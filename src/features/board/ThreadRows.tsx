"use client";

import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, Stack, Tag, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { isPlainActivation } from "@/lib/activation";
import { formatCount } from "@/lib/format";
import { stackMemory } from "./stack-memory";
import { formatAge, tagTones, threadPath, type ThreadSummary } from "./threads";

type ThreadRowsProps = {
  threads: readonly ThreadSummary[];
  now: string;
};

/** The member's own threads: read-only rows that open the board's thread panel
 * through a plain SPA push (modified clicks keep the native tab behavior). */
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
          meta={
            <Stack gap={4}>
              <Text as="span" role="hint">
                {[
                  messages.board.boards[thread.board],
                  formatAge(thread.lastActivityAt, now),
                  formatCount(thread.votes, pluralForms.vote),
                  formatCount(thread.replies, pluralForms.reply),
                ].join(" · ")}
              </Text>
              {thread.tags.length > 0 ? (
                <Stack direction="row" gap={4} wrap>
                  {thread.tags.map((tag) => (
                    <Tag key={tag} tone={tagTones[tag]}>
                      {messages.board.tags[tag]}
                    </Tag>
                  ))}
                </Stack>
              ) : null}
            </Stack>
          }
        />
      ))}
    </Stack>
  );
}
