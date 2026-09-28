"use client";

import type { MouseEvent } from "react";
import {
  Button,
  Field,
  Heading,
  SegmentedControl,
  Stack,
  Tag,
  Text,
  focusNextControl,
} from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import {
  hasUpvoted,
  rankReadroomMode,
  readroomModes,
  type Readroom,
  type ReadroomMode,
  type ReadroomTagId,
} from "../model/readrooms";
import { searchTerms, type ReadroomHit, type ReadroomQuery } from "../model/search";
import { ReadroomCard } from "./ReadroomCard";
import { ReadroomSearchResults } from "./ReadroomSearchResults";
import styles from "../readroom.module.css";

/** The feed's compose control: closing the layer hands focus back to it. */
export const readroomComposeButtonId = "readroom-compose";

export type ReadroomFeedProps = {
  readrooms: readonly Readroom[];
  now: string;
  currentId?: string;
  // Search, mode and tags are URL state; actor switches read the live corpus.
  query: ReadroomQuery;
  onQueryChange: (patch: Partial<ReadroomQuery>) => void;
  availableTags: readonly ReadroomTagId[];
  hits: readonly ReadroomHit[];
  // The session's handle for the vote chips (null reads as a guest).
  voter: string | null;
  // Session-composed tasks: their cards activate in place, without a link.
  localReadroomIds: ReadonlySet<string>;
  onActivate: (id: string, event?: MouseEvent<HTMLElement>) => void;
  onJumpToHit: (hit: ReadroomHit, event?: MouseEvent<HTMLElement>) => void;
  onToggleVote: (id: string) => void;
  onCompose: () => void;
};

/** The readroom's feed: the mode's ranked tasks, stopped cycles included
 * under their ARCHIVED chip. */
export function ReadroomFeed({
  readrooms,
  now,
  currentId,
  query,
  onQueryChange,
  availableTags,
  hits,
  voter,
  localReadroomIds,
  onActivate,
  onJumpToHit,
  onToggleVote,
  onCompose,
}: ReadroomFeedProps) {
  const entries = rankReadroomMode(readrooms, query.mode, now);
  const searching = searchTerms(query.q).length > 0;
  const orderedHits = entries.flatMap((entry) => hits.filter((hit) => hit.taskId === entry.id));

  function toggleTag(tag: ReadroomTagId) {
    onQueryChange({
      tags: query.tags.includes(tag)
        ? query.tags.filter((item) => item !== tag)
        : [...query.tags, tag],
    });
  }

  const cards = (tasks: readonly Readroom[]) =>
    tasks.map((readroom) => (
      <Stack key={readroom.id} navRow>
        <ReadroomCard
          readroom={readroom}
          now={now}
          current={readroom.id === currentId}
          local={localReadroomIds.has(readroom.id)}
          voted={hasUpvoted(readroom.upvotes, voter)}
          onVote={() => onToggleVote(readroom.id)}
          onActivate={(event) => onActivate(readroom.id, event)}
        />
      </Stack>
    ));

  return (
    <Stack gap={8} className={styles.feed}>
      <Heading level={1} className="sr-only">
        {messages.readroom.feed.heading}
      </Heading>

      <Stack direction="row" gap={8} align="center" justify="space-between" wrap>
        <Text role="hint">
          {searching
            ? `${formatCount(entries.length, pluralForms.task)} · ${formatCount(orderedHits.length, pluralForms.match)}`
            : formatCount(entries.length, pluralForms.task)}
        </Text>
        <Button id={readroomComposeButtonId} variant="primary" onClick={onCompose}>
          {messages.readroom.feed.newTask}
        </Button>
      </Stack>

      <Stack direction="row" gap={8} align="center" wrap navRow>
        <Field
          name="q"
          label={messages.readroom.feed.search.label}
          placeholder={messages.readroom.feed.search.placeholder}
          hideLabel
          value={query.q}
          onChange={(q: string) => onQueryChange({ q })}
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
            // Enter repeats the current search with the present clock, then
            // follows the DOS row walk to the next control.
            onQueryChange({ q: query.q });
            if (focusNextControl(event.currentTarget)) event.preventDefault();
          }}
        />
        {query.q ? (
          <Button onClick={() => onQueryChange({ q: "" })}>
            {messages.readroom.feed.search.clear}
          </Button>
        ) : null}
      </Stack>
      <Stack direction="row" gap={8} align="center" wrap navRow>
        <SegmentedControl
          mode="buttons"
          label={messages.readroom.feed.modeLabel}
          value={query.mode}
          onChange={(mode: ReadroomMode) => onQueryChange({ mode })}
          options={readroomModes.map((entry) => ({
            value: entry,
            label: messages.readroom.feed.modes[entry],
          }))}
        />
      </Stack>
      {searching ? <Text role="hint">{messages.readroom.feed.searchScope}</Text> : null}

      {availableTags.length > 0 ? (
        <Stack direction="row" gap={4} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.readroom.feed.tagLabel}
          </Text>
          {availableTags.map((tag) => (
            <Tag key={tag} active={query.tags.includes(tag)} onClick={() => toggleTag(tag)}>
              {messages.readroom.tags[tag]}
            </Tag>
          ))}
        </Stack>
      ) : null}

      {readrooms.length === 0 ? (
        <Text role="hint">
          {searching
            ? messages.readroom.feed.search.empty
            : query.tags.length
              ? messages.readroom.feed.emptyMode
              : messages.readroom.feed.empty}
        </Text>
      ) : entries.length === 0 ? (
        <Text role="hint">
          {searching ? messages.readroom.feed.search.empty : messages.readroom.feed.emptyMode}
        </Text>
      ) : searching ? (
        <ReadroomSearchResults
          hits={orderedHits}
          readrooms={entries}
          localReadroomIds={localReadroomIds}
          currentId={currentId}
          onJump={onJumpToHit}
        />
      ) : (
        <Stack gap={8}>{cards(entries)}</Stack>
      )}
    </Stack>
  );
}
