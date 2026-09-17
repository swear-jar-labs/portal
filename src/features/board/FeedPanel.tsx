"use client";

import type { MouseEvent } from "react";
import { Heading, Select, Stack, Tag, Text, type SelectOption } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { boardIds, tagIds, tagTones, type TagId, type ThreadSummary } from "@/shared/board/threads";
import { threadSorts, type FeedQuery } from "./feed";
import { ThreadCard } from "./ThreadCard";
import styles from "./board.module.css";

const BOARD_FILTER_ALL = "all";
type BoardFilter = (typeof boardIds)[number] | typeof BOARD_FILTER_ALL;

export type FeedPanelProps = {
  threads: readonly ThreadSummary[];
  now: string;
  query: FeedQuery;
  currentThreadId?: string;
  onQueryChange: (patch: Partial<FeedQuery>) => void;
  onActivateThread: (threadId: string, event?: MouseEvent<HTMLElement>) => void;
};

export function FeedPanel({
  threads,
  now,
  query,
  currentThreadId,
  onQueryChange,
  onActivateThread,
}: FeedPanelProps) {
  const boardOptions: SelectOption<BoardFilter>[] = [
    { value: BOARD_FILTER_ALL, label: messages.board.feed.allBoards },
    ...boardIds.map((id): SelectOption<BoardFilter> => ({
      value: id,
      label: messages.board.boards[id],
    })),
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

        <Text role="hint">{formatCount(threads.length, pluralForms.thread)}</Text>
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
                onActivate={(event) => onActivateThread(thread.id, event)}
                onFilterTag={toggleTag}
              />
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
