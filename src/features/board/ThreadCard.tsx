"use client";

import type { MouseEvent } from "react";
import { Avatar, Card, Stack, Tag, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import {
  formatAge,
  tagTones,
  threadPath,
  type TagId,
  type ThreadSummary,
} from "@/shared/board/threads";

export const threadCardId = (id: string) => `thread-card-${id}`;

export type ThreadCardProps = {
  thread: ThreadSummary;
  now: string;
  current?: boolean;
  onActivate: (event?: MouseEvent<HTMLElement>) => void;
  onFilterTag: (tag: TagId) => void;
};

export function ThreadCard({
  thread,
  now,
  current = false,
  onActivate,
  onFilterTag,
}: ThreadCardProps) {
  const markers = thread.pinned || thread.locked;

  return (
    <Card
      id={threadCardId(thread.id)}
      title={thread.title}
      href={threadPath(thread.id)}
      current={current}
      onActivate={onActivate}
      leading={
        markers ? (
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
        <Stack direction="row" gap={6} align="center" wrap>
          <Avatar user={thread.author.user} src={thread.author.avatar} />
          <Text as="span">{thread.author.user}</Text>
          <Text as="span" role="hint">
            {[
              formatAge(thread.lastActivityAt, now),
              formatCount(thread.votes, pluralForms.vote),
              formatCount(thread.replies, pluralForms.reply),
            ].join(" · ")}
          </Text>
        </Stack>
      }
      // The tags land as direct children of the card's actions row: its own
      // flex gap stays click-through, so the stretched link owns every gap
      // between them (a wrapper would raise its whole box over the link).
      actions={thread.tags.map((tag) => (
        <Tag key={tag} tone={tagTones[tag]} onClick={() => onFilterTag(tag)}>
          {messages.board.tags[tag]}
        </Tag>
      ))}
    />
  );
}
