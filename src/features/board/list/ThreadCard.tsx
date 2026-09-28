"use client";

import type { MouseEvent } from "react";
import { Card, FileIcon, Stack, Tag, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { MemberLink } from "@/features/members/contracts";
import { isThreadHidden, useModeration } from "@/features/moderation/contracts";
import { useShellSession } from "@/features/shell";
import {
  formatAge,
  tagTones,
  threadPath,
  type TagId,
  type ThreadSummary,
  type ThreadTechId,
} from "../model/threads";
import { VoteButton } from "./VoteButton";
import styles from "../board.module.css";

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
  onFilterTech: (tech: ThreadTechId) => void;
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
  onFilterTech,
}: ThreadCardProps) {
  const moderation = useModeration();
  const session = useShellSession();
  const masked =
    isThreadHidden(moderation, thread.id) &&
    !session?.admin &&
    session?.user !== thread.author.user;
  // A composed thread has no route: the card activates in place (the title is a
  // button, so a context menu or drag cannot open a page that does not exist).
  const activation = local ? { onActivate } : { href: threadPath(thread.id), onActivate };

  return (
    <Card
      id={threadCardId(thread.id)}
      title={masked ? messages.moderation.hiddenThread : thread.title}
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
          <MemberLink person={thread.author} />
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
          {!masked ? <VoteButton votes={thread.votes} voted={voted} onToggle={onVote} /> : null}
          {thread.tags.map((tag) => (
            <Tag key={tag} tone={tagTones[tag]} onClick={() => onFilterTag(tag)}>
              {messages.board.tags[tag]}
            </Tag>
          ))}
          {thread.techs.map((tech) => (
            <Tag key={tech} onClick={() => onFilterTech(tech)}>
              {messages.readroom.tags[tech]}
            </Tag>
          ))}
        </>
      }
    />
  );
}
