"use client";

import { useState } from "react";
import {
  Button,
  Field,
  Form,
  Heading,
  Select,
  Stack,
  Tag,
  Text,
  type SelectOption,
} from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MAX_TAGS, toggleTagSelection } from "@/lib/tags";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import {
  boardTitle,
  composableBoardIds,
  tagIds,
  tagTones,
  type BoardId,
  type BoardOption,
  type TagId,
} from "../model/threads";
import { makeComposeSchema, type ComposeInput } from "../model/schema";

const BODY_ROWS = 6;

const INITIAL_VALUES: ComposeInput = { board: "general", tags: [], title: "", body: "" };

type ComposeErrors = {
  tags?: string;
  title?: string;
  body?: string;
};

export type ComposePanelProps = {
  defaultBoard?: BoardId;
  projectBoards?: readonly BoardOption[];
  onSubmit: (input: ComposeInput) => void;
  onCancel: () => void;
};

/** The new-thread layer: board, tags, title and the opening post. A mock submit
 * until the board has a backend (the thread lives in the session). */
export function ComposePanel({
  defaultBoard,
  projectBoards = [],
  onSubmit,
  onCancel,
}: ComposePanelProps) {
  const boardOptions: SelectOption<BoardId>[] = [
    ...composableBoardIds.map((id) => ({ value: id, label: boardTitle(id) })),
    ...projectBoards
      .filter((board) => !board.archived && !composableBoardIds.some((id) => id === board.id))
      .map((board) => ({ value: board.id, label: board.name })),
  ];
  const [values, setValues] = useState<ComposeInput>(() => ({
    ...INITIAL_VALUES,
    board: defaultBoard ?? INITIAL_VALUES.board,
  }));
  const [errors, setErrors] = useState<ComposeErrors>({});

  function update<K extends keyof ComposeInput>(key: K, value: ComposeInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleTag(tag: TagId) {
    update("tags", toggleTagSelection(values.tags, tag));
  }

  function handleSubmit() {
    const parsed = makeComposeSchema(boardOptions.map((board) => board.value)).safeParse(values);
    if (!parsed.success) {
      const hasError = (field: keyof ComposeErrors) =>
        parsed.error.issues.some((issue) => issue.path[0] === field);
      setErrors({
        tags: hasError("tags") ? messages.board.compose.errors.tags : undefined,
        title: hasError("title") ? messages.board.compose.errors.title : undefined,
        body: hasError("body") ? messages.board.compose.errors.body : undefined,
      });
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  return (
    <Form onSubmit={handleSubmit} ariaLabel={messages.board.compose.heading}>
      <Stack gap={10}>
        <Heading level={1}>{messages.board.compose.heading}</Heading>

        <Select
          label={messages.board.compose.fields.board}
          name="board"
          value={values.board}
          onChange={(board) => update("board", board)}
          options={boardOptions}
        />

        <Stack gap={4}>
          <Text as="span" role="hint">
            {messages.board.compose.fields.tags}
          </Text>
          {/* One walk row: ←/→ moves between tags, ↑/↓ leaves for the fields. */}
          <Stack direction="row" gap={4} wrap navRow>
            {tagIds.map((tag) => (
              <Tag
                key={tag}
                tone={tagTones[tag]}
                active={values.tags.includes(tag)}
                disabled={!values.tags.includes(tag) && values.tags.length >= MAX_TAGS}
                onClick={() => toggleTag(tag)}
              >
                {messages.board.tags[tag]}
              </Tag>
            ))}
          </Stack>
          {errors.tags ? (
            <Text as="span" role="danger">
              {errors.tags}
            </Text>
          ) : null}
        </Stack>

        <Field
          label={messages.board.compose.fields.title}
          name="title"
          value={values.title}
          onChange={(title) => update("title", title)}
          required
          error={errors.title}
        />
        <MarkdownEditor
          label={messages.board.compose.fields.body}
          name="body"
          value={values.body}
          onChange={(body) => update("body", body)}
          rows={BODY_ROWS}
          required
          error={errors.body}
        />

        {/* The submit pair walks as one row, like the reply composer's. */}
        <Stack direction="row" gap={10} wrap navRow>
          <Button type="submit" variant="primary">
            {messages.board.compose.submit}
          </Button>
          <Button onClick={onCancel}>{messages.board.compose.cancel}</Button>
        </Stack>
        <Text role="hint">{messages.board.compose.hint}</Text>
      </Stack>
    </Form>
  );
}
