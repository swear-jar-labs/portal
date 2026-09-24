"use client";

import type { MouseEvent } from "react";
import { Button, Heading, Select, Stack, Tag, Text, type SelectOption } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import {
  boardIds,
  boardTitle,
  tagIds,
  tagTones,
  type BoardOption,
  type TagId,
  type ThreadSummary,
} from "./threads";
import { threadSorts, type FeedQuery } from "./feed";
import { ThreadCard } from "./ThreadCard";
import styles from "./board.module.css";

const BOARD_FILTER_ALL = "all";
type BoardFilter = string;

/** The feed's compose control: closing the layer hands focus back to it. */
export const composeButtonId = "board-compose";

export type FeedPanelProps = {
  threads: readonly ThreadSummary[];
  now: string;
  query: FeedQuery;
  currentThreadId?: string;
  votedThreadIds: ReadonlySet<string>;
  // Session-composed threads: their cards activate in place, without a link.
  localThreadIds: ReadonlySet<string>;
  onQueryChange: (patch: Partial<FeedQuery>) => void;
  onActivateThread: (threadId: string, event?: MouseEvent<HTMLElement>) => void;
  onVoteThread: (threadId: string) => void;
  onCompose: () => void;
  projectBoards?: readonly BoardOption[];
};

export function FeedPanel({
  threads,
  now,
  query,
  currentThreadId,
  votedThreadIds,
  localThreadIds,
  onQueryChange,
  onActivateThread,
  onVoteThread,
  onCompose,
  projectBoards = [],
}: FeedPanelProps) {
  const boardOptions: SelectOption<BoardFilter>[] = [
    { value: BOARD_FILTER_ALL, label: messages.board.feed.allBoards },
    ...boardIds.map((id): SelectOption<BoardFilter> => ({
      value: id,
      label: boardTitle(id),
    })),
    ...projectBoards
      .filter((board) => !boardIds.some((id) => id === board.id))
      .map((board) => ({ value: board.id, label: board.name })),
  ];

  const toggleTag = (tag: TagId) => {
    onQueryChange({ tag: query.tag === tag ? undefined : tag });
  };

  const filtered = query.board !== undefined || query.tag !== undefined;

  return (
    <Stack gap={8} className={styles.feed}>
      <Heading level={1} className="sr-only">
        {messages.board.feed.heading}
      </Heading>

      <Stack gap={4} className={styles.filters}>
        <Stack direction="row" gap={16} align="flex-end" wrap navRow>
          <Select
            label={messages.board.feed.boardLabel}
            name="board"
            value={query.board ?? BOARD_FILTER_ALL}
            onChange={(value) => {
              onQueryChange({ board: value === BOARD_FILTER_ALL ? undefined : value });
            }}
            options={boardOptions}
          />
          <Stack direction="row" gap={4} align="center" wrap>
            <Text as="span" role="hint">
              {messages.board.feed.sortLabel}
            </Text>
            {threadSorts.map((sort) => (
              <Tag key={sort} active={query.sort === sort} onClick={() => onQueryChange({ sort })}>
                {messages.board.feed.sorts[sort]}
              </Tag>
            ))}
          </Stack>
        </Stack>

        <Stack direction="row" gap={4} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.board.feed.tagLabel}
          </Text>
          {tagIds.map((tag) => (
            <Tag
              key={tag}
              tone={tagTones[tag]}
              active={query.tag === tag}
              onClick={() => toggleTag(tag)}
            >
              {messages.board.tags[tag]}
            </Tag>
          ))}
        </Stack>

        <Stack direction="row" gap={8} align="center" justify="space-between" wrap>
          <Text role="hint">{formatCount(threads.length, pluralForms.thread)}</Text>
          <Button id={composeButtonId} variant="primary" onClick={onCompose}>
            {messages.board.feed.newThread}
          </Button>
        </Stack>
      </Stack>

      {threads.length === 0 ? (
        <Text role="hint">
          {filtered ? messages.board.feed.emptyFilter : messages.board.feed.empty}
        </Text>
      ) : (
        <Stack gap={8}>
          {threads.map((thread) => (
            <Stack key={thread.id} navRow>
              <ThreadCard
                thread={thread}
                now={now}
                current={thread.id === currentThreadId}
                voted={votedThreadIds.has(thread.id)}
                local={localThreadIds.has(thread.id)}
                onActivate={(event) => onActivateThread(thread.id, event)}
                onVote={() => onVoteThread(thread.id)}
                onFilterTag={toggleTag}
              />
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
