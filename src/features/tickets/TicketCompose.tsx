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
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import type { ProjectSlug } from "@/features/projects/contracts";
import {
  DEFAULT_TICKET_PROJECT,
  ticketSizes,
  ticketTagIds,
  ticketTagTones,
  type TicketSize,
  type TicketTagId,
} from "./tickets";
import { ticketComposeSchema, type TicketComposeInput } from "./schema";
import type { TicketProjectOption } from "./TicketsFeed";

const BODY_ROWS = 6;

type ComposeErrors = {
  title?: string;
  body?: string;
  tags?: string;
};

const sizeOptions: SelectOption<TicketSize>[] = ticketSizes.map((size) => ({
  value: size,
  label: size,
}));

/** The new-ticket layer: project, title, size, tags and the opening body. A
 * project entry preselects its project but keeps the same editable form as the
 * tracker. A mock submit until the tickets have a backend (the ticket lives in
 * the session). */
export function TicketCompose({
  projects,
  defaultProject,
  onSubmit,
  onCancel,
}: {
  projects: readonly TicketProjectOption[];
  defaultProject?: ProjectSlug;
  onSubmit: (input: TicketComposeInput) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<TicketComposeInput>({
    project: defaultProject ?? projects[0]?.slug ?? DEFAULT_TICKET_PROJECT,
    title: "",
    body: "",
    size: "S",
    tags: [],
  });
  const [errors, setErrors] = useState<ComposeErrors>({});

  function update<K extends keyof TicketComposeInput>(key: K, value: TicketComposeInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleTag(tag: TicketTagId) {
    update(
      "tags",
      values.tags.includes(tag)
        ? values.tags.filter((current) => current !== tag)
        : [...values.tags, tag],
    );
  }

  function handleSubmit() {
    const parsed = ticketComposeSchema.safeParse(values);
    if (!parsed.success) {
      const hasError = (field: keyof ComposeErrors) =>
        parsed.error.issues.some((issue) => issue.path[0] === field);
      setErrors({
        title: hasError("title") ? messages.tickets.compose.errors.title : undefined,
        body: hasError("body") ? messages.tickets.compose.errors.body : undefined,
        tags: hasError("tags") ? messages.tickets.compose.errors.tags : undefined,
      });
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  const projectOptions: SelectOption<ProjectSlug>[] = projects.map((project) => ({
    value: project.slug,
    label: project.name,
  }));

  return (
    <Form onSubmit={handleSubmit} ariaLabel={messages.tickets.compose.heading}>
      <Stack gap={10}>
        <Heading level={1}>{messages.tickets.compose.heading}</Heading>

        <Select
          label={messages.tickets.compose.fields.project}
          name="project"
          value={values.project}
          onChange={(project) => update("project", project)}
          options={projectOptions}
        />

        <Field
          label={messages.tickets.compose.fields.title}
          name="title"
          value={values.title}
          onChange={(title) => update("title", title)}
          required
          error={errors.title}
        />
        <MarkdownEditor
          label={messages.tickets.compose.fields.body}
          name="body"
          value={values.body}
          onChange={(body) => update("body", body)}
          rows={BODY_ROWS}
          required
          error={errors.body}
        />

        <Select
          label={messages.tickets.compose.fields.size}
          name="size"
          value={values.size}
          onChange={(size) => update("size", size)}
          options={sizeOptions}
        />

        <Stack gap={4}>
          <Text as="span" role="hint">
            {messages.tickets.compose.fields.tags}
          </Text>
          {/* One walk row: ←/→ moves between tags, ↑/↓ leaves for the fields. */}
          <Stack direction="row" gap={4} wrap navRow>
            {ticketTagIds.map((tag) => (
              <Tag
                key={tag}
                tone={ticketTagTones[tag]}
                active={values.tags.includes(tag)}
                onClick={() => toggleTag(tag)}
              >
                {messages.tickets.tags[tag]}
              </Tag>
            ))}
          </Stack>
          {errors.tags ? (
            <Text as="span" role="danger">
              {errors.tags}
            </Text>
          ) : null}
        </Stack>

        {/* The submit pair walks as one row, like the board composer's. */}
        <Stack direction="row" gap={10} wrap navRow>
          <Button type="submit" variant="primary">
            {messages.tickets.compose.submit}
          </Button>
          <Button onClick={onCancel}>{messages.tickets.compose.cancel}</Button>
        </Stack>
        <Text role="hint">{messages.tickets.compose.hint}</Text>
      </Stack>
    </Form>
  );
}
