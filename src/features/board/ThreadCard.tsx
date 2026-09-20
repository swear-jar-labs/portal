"use client";

import type { MouseEvent } from "react";
import { Card, FileIcon, Stack, Tag, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { MemberLink } from "@/features/members/contracts";
import {
  formatAge,
  tagTones,
  threadPath,
  FEED_PATH,
  type TagId,
  type ThreadSummary,
} from "./threads";
import { VoteButton } from "./VoteButton";
import styles from "./board.module.css";

export const threadCardId = (id: string) => `thread-card-${id}`;

export type ThreadCardProps = {
  thread: ThreadSummary;
  now: string;
  current?: boolean;
  voted: boolean;
  // A thread composed in this session has no route: its card activates in
  // place instead of linking to a page that does not exist.
  local?: boolean;
  onActivate: (event?: MouseEvent<HTMLElement>) => void;
  onVote: () => void;
  onFilterTag: (tag: TagId) => void;
};

export function ThreadCard({
  thread,
  now,
  current = false,
  voted,
  local = false,
  onActivate,
  onVote,
  onFilterTag,
}: ThreadCardProps) {
  // A composed thread has no route: the card activates in place (the title is a
  // button, so a context menu or drag cannot open a page that does not exist).
  const activation = local ? { onActivate } : { href: threadPath(thread.id), onActivate };

  return (
    <Card
      id={threadCardId(thread.id)}
      title={thread.title}
      className={styles.cardTitle}
      current={current}
      {...activation}
      leading={
        <Stack direction="row" gap={6} align="center">
          <FileIcon kind="exe" icon="speech" />
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
      }
      meta={
        <Stack direction="row" gap={6} align="center" wrap>
          <MemberLink person={thread.author} sectionPath={FEED_PATH} />
          <Text as="span" role="hint">
            {[
              formatAge(thread.lastActivityAt, now),
              formatCount(thread.replies, pluralForms.reply),
            ].join(" · ")}
          </Text>
        </Stack>
      }
      metaPosition="before"
      metaInteractive
      // The tags land as direct children of the card's actions row: its own
      // flex gap stays click-through, so the stretched link owns every gap
      // between them (a wrapper would raise its whole box over the link).
      actions={
        <>
          <VoteButton votes={thread.votes} voted={voted} onToggle={onVote} />
          {thread.tags.map((tag) => (
            <Tag key={tag} tone={tagTones[tag]} onClick={() => onFilterTag(tag)}>
              {messages.board.tags[tag]}
            </Tag>
          ))}
        </>
      }
    />
  );
}
