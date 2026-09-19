"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Field, Form, Heading, Stack, Tag, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import { defaultDeadlineLocal, fromLocalInput, type ReadroomDraft } from "./datetime";
import { readroomTagIds, type ReadroomAttachment, type ReadroomTagId } from "./readrooms";
import { attachmentsFromFiles, releaseAttachments } from "./attachments";
import { ReadroomFilesRow } from "./ReadroomFilesRow";
import { readroomSchema } from "./schema";

const DESCRIPTION_ROWS = 6;

type ComposeValues = {
  title: string;
  tags: ReadroomTagId[];
  description: string;
  sourceUrl: string;
  ticket: string;
  deadline: string;
};

// The fields the form validates, in walk order: the error map is keyed by them.
const COMPOSE_FIELDS = [
  "title",
  "tags",
  "description",
  "sourceUrl",
  "ticket",
  "deadline",
] as const satisfies readonly (keyof ComposeValues)[];

type ComposeField = (typeof COMPOSE_FIELDS)[number];
type ComposeErrors = Partial<Record<ComposeField, string>>;

function initialValues(): ComposeValues {
  return {
    title: "",
    tags: [],
    description: "",
    sourceUrl: "",
    ticket: "",
    deadline: defaultDeadlineLocal(Date.now()),
  };
}

export type ReadroomComposePanelProps = {
  onSubmit: (draft: ReadroomDraft) => void;
  onCancel: () => void;
};

/** The new-task layer: the optional source permalink, the tags, the opening
 * description and the deadline. A mock submit until the readroom has a
 * backend (the task lives in the session). */
export function ReadroomComposePanel({ onSubmit, onCancel }: ReadroomComposePanelProps) {
  const [values, setValues] = useState<ComposeValues>(initialValues);
  const [errors, setErrors] = useState<ComposeErrors>({});
  const [files, setFiles] = useState<readonly ReadroomAttachment[]>([]);
  const filesRef = useRef<readonly ReadroomAttachment[]>([]);
  const submittedRef = useRef(false);

  // The unsubmitted draft's blobs die with the form; the submitted ones are
  // handed to the store.
  useEffect(
    () => () => {
      if (!submittedRef.current) releaseAttachments(filesRef.current);
    },
    [],
  );

  function updateFiles(next: readonly ReadroomAttachment[]) {
    filesRef.current = next;
    setFiles(next);
  }

  function addFiles(picked: FileList) {
    updateFiles([...filesRef.current, ...attachmentsFromFiles(picked)]);
  }

  function removeFile(attachment: ReadroomAttachment) {
    releaseAttachments([attachment]);
    updateFiles(filesRef.current.filter((entry) => entry.id !== attachment.id));
  }

  function update<K extends keyof ComposeValues>(key: K, value: ComposeValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleTag(tag: ReadroomTagId) {
    update(
      "tags",
      values.tags.includes(tag)
        ? values.tags.filter((current) => current !== tag)
        : [...values.tags, tag],
    );
  }

  // An empty optional field never reaches the schema: absent means absent.
  function optional(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }

  function handleSubmit() {
    const parsed = readroomSchema.safeParse({
      title: values.title,
      tags: values.tags,
      description: values.description,
      sourceUrl: optional(values.sourceUrl),
      ticket: optional(values.ticket),
      deadline: values.deadline,
    });
    if (!parsed.success) {
      const hasError = (field: ComposeField) =>
        parsed.error.issues.some((issue) => issue.path[0] === field);
      const next: ComposeErrors = {};
      for (const field of COMPOSE_FIELDS) {
        if (hasError(field)) next[field] = messages.readroom.compose.errors[field];
      }
      setErrors(next);
      return;
    }
    const deadlineAt = fromLocalInput(parsed.data.deadline);
    if (deadlineAt === null || Date.parse(deadlineAt) <= Date.now()) {
      setErrors({ deadline: messages.readroom.compose.errors.deadline });
      return;
    }
    setErrors({});
    submittedRef.current = true;
    onSubmit({
      title: parsed.data.title,
      tags: parsed.data.tags,
      description: parsed.data.description,
      ...(parsed.data.sourceUrl === undefined ? {} : { sourceUrl: parsed.data.sourceUrl }),
      ...(parsed.data.ticket === undefined ? {} : { ticket: parsed.data.ticket }),
      attachments: filesRef.current,
      deadlineAt,
    });
  }

  return (
    <Form onSubmit={handleSubmit} ariaLabel={messages.readroom.compose.heading}>
      <Stack gap={10}>
        <Heading level={1}>{messages.readroom.compose.heading}</Heading>

        <Field
          label={messages.readroom.compose.fields.title}
          name="title"
          value={values.title}
          onChange={(title) => update("title", title)}
          required
          error={errors.title}
        />

        <Stack gap={4}>
          <Text as="span" role="hint">
            {messages.readroom.compose.fields.tags}
          </Text>
          {/* One walk row: ←/→ moves between tags, ↑/↓ leaves for the fields. */}
          <Stack direction="row" gap={4} wrap navRow>
            {readroomTagIds.map((tag) => (
              <Tag key={tag} active={values.tags.includes(tag)} onClick={() => toggleTag(tag)}>
                {messages.readroom.tags[tag]}
              </Tag>
            ))}
          </Stack>
          {errors.tags ? (
            <Text as="span" role="danger">
              {errors.tags}
            </Text>
          ) : null}
        </Stack>

        <MarkdownEditor
          label={messages.readroom.compose.fields.description}
          name="description"
          value={values.description}
          onChange={(description) => update("description", description)}
          rows={DESCRIPTION_ROWS}
          required
          error={errors.description}
        />

        <Field
          label={messages.readroom.compose.fields.sourceUrl}
          name="sourceUrl"
          value={values.sourceUrl}
          onChange={(sourceUrl) => update("sourceUrl", sourceUrl)}
          error={errors.sourceUrl}
        />
        <Field
          label={messages.readroom.compose.fields.ticket}
          name="ticket"
          value={values.ticket}
          onChange={(ticket) => update("ticket", ticket)}
          error={errors.ticket}
        />

        <ReadroomFilesRow attachments={files} editable onAdd={addFiles} onRemove={removeFile} />

        <Field
          label={messages.readroom.compose.fields.deadline}
          name="deadline"
          type="datetime-local"
          value={values.deadline}
          onChange={(deadline) => update("deadline", deadline)}
          required
          error={errors.deadline}
        />

        {/* The submit pair walks as one row, like the board composer's. */}
        <Stack direction="row" gap={10} wrap navRow>
          <Button type="submit" variant="primary">
            {messages.readroom.compose.submit}
          </Button>
          <Button onClick={onCancel}>{messages.readroom.compose.cancel}</Button>
        </Stack>
        <Text role="hint">{messages.readroom.compose.hint}</Text>
      </Stack>
    </Form>
  );
}
