"use client";

import { useMemo, useState, type MouseEvent } from "react";
import {
  Button,
  ComboBox,
  Field,
  Heading,
  SegmentedControl,
  Select,
  Stack,
  Tag,
  Text,
  focusNextControl,
  type SelectOption,
} from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { SEARCH_FIELD_ID } from "@/features/shell";
import { formatCount } from "@/lib/format";
import { MAX_TAG_QUERY_LENGTH } from "@/lib/tags";
import {
  boardIds,
  boardTitle,
  isTagId,
  tagIds,
  tagTones,
  threadTechIds,
  type BoardOption,
  type TagId,
  type ThreadSummary,
  type ThreadTechId,
} from "../model/threads";
import { isBlankSearch, type ThreadSearchHit } from "../model/search";
import { threadSorts, type FeedQuery, type ThreadSort } from "../model/feed";
import { SearchResults } from "./SearchResults";
import { ThreadCard } from "./ThreadCard";
import styles from "../board.module.css";

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
  // Grouped matches by thread id under an active query, empty otherwise.
  searchHits: ReadonlyMap<string, ThreadSearchHit>;
  onQueryChange: (patch: Partial<FeedQuery>) => void;
  onActivateThread: (threadId: string, event?: MouseEvent<HTMLElement>) => void;
  onJumpToMatch: (
    threadId: string,
    postId: string | undefined,
    event?: MouseEvent<HTMLElement>,
  ) => void;
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
  searchHits,
  onQueryChange,
  onActivateThread,
  onJumpToMatch,
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

  // The unified tag catalog behind the filter box: statuses first, then the
  // techs. Picks toggle their membership (multi-select AND for both, like the
  // readroom filter); card chips toggle through the same membership.
  // The selections keep a render-stable identity for the memo below.
  const tags = useMemo(() => query.tags ?? [], [query.tags]);
  const techs = useMemo(() => query.techs ?? [], [query.techs]);
  const [tagQuery, setTagQuery] = useState("");
  const tagOptions = useMemo(
    () => [
      ...tagIds
        .filter((tag) => !tags.includes(tag))
        .map((tag) => ({ value: tag, label: messages.board.tags[tag] })),
      ...threadTechIds
        .filter((tech) => !techs.includes(tech))
        .map((tech) => ({ value: tech, label: messages.readroom.tags[tech] })),
    ],
    [tags, techs],
  );

  function pickTagFilter(value: TagId | ThreadTechId) {
    setTagQuery("");
    if (isTagId(value)) toggleTag(value);
    else toggleTech(value);
  }

  function removeTagFilter(value: TagId | ThreadTechId) {
    if (isTagId(value)) {
      onQueryChange({ tags: tags.filter((item) => item !== value) });
    } else {
      onQueryChange({ techs: techs.filter((item) => item !== value) });
    }
  }

  // One control, one reset: the picked tags and the drafted query go together.
  function clearTagFilter() {
    setTagQuery("");
    onQueryChange({ tags: [], techs: [] });
  }

  const toggleTag = (tag: TagId) => {
    onQueryChange({
      tags: tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag],
    });
  };

  const toggleTech = (tech: ThreadTechId) => {
    onQueryChange({
      techs: techs.includes(tech) ? techs.filter((item) => item !== tech) : [...techs, tech],
    });
  };

  const filtered = query.board !== undefined || tags.length > 0 || techs.length > 0;
  const searching = !isBlankSearch(query.q);
  const matchCount = [...searchHits.values()].reduce((total, hit) => total + hit.totalMatches, 0);

  return (
    <Stack gap={8} className={styles.feed}>
      <Heading level={1} className="sr-only">
        {messages.board.feed.heading}
      </Heading>

      <Stack gap={4} className={styles.filters}>
        {/* The row gap rides a variable: mobile halves it, so the break
            element below costs two small gaps instead of two large ones. */}
        <Stack direction="row" gap="var(--board-row-gap, 16px)" align="flex-end" wrap navRow>
          <Select
            label={messages.board.feed.boardLabel}
            name="board"
            value={query.board ?? BOARD_FILTER_ALL}
            onChange={(value) => {
              onQueryChange({ board: value === BOARD_FILTER_ALL ? undefined : value });
            }}
            options={boardOptions}
          />
          <div aria-hidden="true" className={styles.rowBreak} />
          {/* The field hugs its CLEAR at the dense chip gap; the board picker
              keeps the airy filter rhythm. The tag box rides the same row:
              on mobile it wraps under the search. */}
          <Stack direction="row" gap={4} align="flex-end" wrap>
            <Field
              id={SEARCH_FIELD_ID}
              label={messages.board.feed.search.label}
              name="q"
              value={query.q}
              placeholder={messages.board.feed.search.label}
              hideLabel
              onChange={(q: string) => onQueryChange({ q })}
              // The filter row owns no submit: Enter walks right like ArrowRight.
              onKeyDown={(event) => {
                if (
                  event.key !== "Enter" ||
                  event.shiftKey ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.altKey ||
                  event.nativeEvent.isComposing
                )
                  return;
                if (focusNextControl(event.currentTarget)) event.preventDefault();
              }}
            />
            {query.q !== "" ? (
              <Button onClick={() => onQueryChange({ q: "" })}>
                {messages.board.feed.search.clear}
              </Button>
            ) : null}
            <ComboBox
              label={messages.board.feed.tagLabel}
              name="tag-search"
              hideLabel
              placeholder={messages.board.feed.tagLabel}
              value={tagQuery}
              onChange={setTagQuery}
              options={tagOptions}
              onPick={(option) => pickTagFilter(option.value)}
              emptyText={messages.board.feed.noTagMatch}
              advanceOnPick={false}
              submitOnNoMatch={false}
              maxLength={MAX_TAG_QUERY_LENGTH}
            />
          </Stack>
        </Stack>

        {/* The picked tags read right under their box, before the sort row:
            one tight chip group that only exists while picked. */}
        {tags.length === 0 && techs.length === 0 ? null : (
          <Stack direction="row" gap={4} align="center" wrap navRow>
            {tags.map((tag) => (
              <Tag key={tag} tone={tagTones[tag]} active onClick={() => removeTagFilter(tag)}>
                {messages.board.tags[tag]}
              </Tag>
            ))}
            {techs.map((tech) => (
              <Tag key={tech} active onClick={() => removeTagFilter(tech)}>
                {messages.readroom.tags[tech]}
              </Tag>
            ))}
            <Button
              ariaLabel={`${messages.board.feed.search.clear} ${messages.board.feed.tagLabel}`}
              onClick={clearTagFilter}
            >
              {messages.board.feed.search.clear}
            </Button>
          </Stack>
        )}

        <Stack direction="row" gap={8} align="center" wrap navRow className={styles.sortRow}>
          <SegmentedControl
            mode="buttons"
            label={messages.board.feed.sortLabel}
            value={query.sort}
            onChange={(sort: ThreadSort) => onQueryChange({ sort })}
            options={threadSorts.map((sort) => ({
              value: sort,
              label: messages.board.feed.sorts[sort],
            }))}
          />
        </Stack>

        <Stack direction="row" gap={8} align="center" justify="space-between" wrap>
          <Text role="hint">
            {searching
              ? [
                  formatCount(threads.length, pluralForms.thread),
                  formatCount(matchCount, pluralForms.match),
                ].join(" · ")
              : formatCount(threads.length, pluralForms.thread)}
          </Text>
          <Button id={composeButtonId} variant="primary" onClick={onCompose}>
            {messages.board.feed.newThread}
          </Button>
        </Stack>
      </Stack>

      {threads.length === 0 ? (
        <Text role="hint">
          {searching
            ? messages.board.feed.search.empty
            : filtered
              ? messages.board.feed.emptyFilter
              : messages.board.feed.empty}
        </Text>
      ) : searching ? (
        <SearchResults
          threads={threads}
          now={now}
          hits={searchHits}
          currentThreadId={currentThreadId}
          localThreadIds={localThreadIds}
          onJumpToMatch={onJumpToMatch}
        />
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
                onFilterTech={toggleTech}
              />
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
