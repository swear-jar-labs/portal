"use client";

import { useMemo, useState } from "react";
import {
  Button,
  ComboBox,
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
import { MAX_TAGS, MAX_TAG_QUERY_LENGTH, toggleTagSelection } from "@/lib/tags";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import {
  boardTitle,
  composableBoardIds,
  isTagId,
  tagCatalogLabel,
  tagTones,
  type BoardId,
  type BoardOption,
  type TagCatalog,
  type TagId,
  type ThreadTechId,
} from "../model/threads";
import { makeComposeSchema, type ComposeInput } from "../model/schema";

const BODY_ROWS = 6;

const INITIAL_VALUES: ComposeInput = { board: "general", tags: [], techs: [], title: "", body: "" };

type ComposeErrors = {
  tags?: string;
  techs?: string;
  title?: string;
  body?: string;
};

export type ComposePanelProps = {
  defaultBoard?: BoardId;
  projectBoards?: readonly BoardOption[];
  // The server's tag catalog (statuses first): the search box and the picked
  // chips read their labels from it, never from messages.
  tagCatalog: TagCatalog;
  onSubmit: (input: ComposeInput) => void;
  onCancel: () => void;
};

/** The new-thread layer: board, tags, title and the opening post. A mock submit
 * until the board has a backend (the thread lives in the session). */
export function ComposePanel({
  defaultBoard,
  projectBoards = [],
  tagCatalog,
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

  // The unified tag catalog behind the search box: the server's list
  // (statuses first, each kind in sort order). Picks toggle their membership;
  // the picked read back as removable chips below (statuses with their tone).
  // At the shared cap the catalog closes and names the limit instead.
  const [tagQuery, setTagQuery] = useState("");
  const tagOptions = useMemo(
    () =>
      tagCatalog
        .filter((entry) =>
          isTagId(entry.id) ? !values.tags.includes(entry.id) : !values.techs.includes(entry.id),
        )
        .map((entry) => ({ value: entry.id, label: entry.label })),
    [tagCatalog, values.tags, values.techs],
  );
  const pickedCount = values.tags.length + values.techs.length;
  const atTagCap = pickedCount >= MAX_TAGS;

  function addTag(value: TagId | ThreadTechId) {
    if (isTagId(value)) update("tags", toggleTagSelection(values.tags, value));
    else update("techs", toggleTagSelection(values.techs, value));
    setTagQuery("");
  }

  function removeTag(value: TagId | ThreadTechId) {
    if (isTagId(value)) {
      update(
        "tags",
        values.tags.filter((item) => item !== value),
      );
    } else {
      update(
        "techs",
        values.techs.filter((item) => item !== value),
      );
    }
  }

  function handleSubmit() {
    const parsed = makeComposeSchema(boardOptions.map((board) => board.value)).safeParse(values);
    if (!parsed.success) {
      const hasError = (field: keyof ComposeErrors) =>
        parsed.error.issues.some((issue) => issue.path[0] === field);
      setErrors({
        tags: hasError("tags") ? messages.board.compose.errors.tags : undefined,
        techs: hasError("techs") ? messages.board.compose.errors.techs : undefined,
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
          <ComboBox
            label={messages.board.compose.fields.tags}
            name="tags-search"
            value={tagQuery}
            onChange={setTagQuery}
            // At the cap the catalog closes: the empty box names the limit.
            // A removal reopens it.
            options={atTagCap ? [] : tagOptions}
            onPick={(option) => addTag(option.value)}
            emptyText={
              atTagCap ? messages.board.compose.errors.tags : messages.board.compose.noTagMatch
            }
            advanceOnPick={false}
            submitOnNoMatch={false}
            maxLength={MAX_TAG_QUERY_LENGTH}
            error={errors.tags ?? errors.techs}
          />
          {pickedCount === 0 ? null : (
            /* One walk row: ←/→ moves between the picked tags, ↑/↓ leaves. */
            <Stack direction="row" gap={4} wrap navRow>
              {values.tags.map((tag) => (
                <Tag key={tag} tone={tagTones[tag]} active onClick={() => removeTag(tag)}>
                  {tagCatalogLabel(tagCatalog, tag)}
                </Tag>
              ))}
              {values.techs.map((tech) => (
                <Tag key={tech} active onClick={() => removeTag(tech)}>
                  {tagCatalogLabel(tagCatalog, tech)}
                </Tag>
              ))}
            </Stack>
          )}
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
