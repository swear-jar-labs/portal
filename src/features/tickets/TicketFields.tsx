"use client";

import { Field, Select, Stack, Tag, Text, type SelectOption } from "@swearjar/dos";
import { type ReactNode } from "react";
import { messages } from "@/content/messages";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import type { TicketEditInput } from "./schema";
import {
  ticketPriorities,
  ticketSizes,
  ticketTagIds,
  ticketTagTones,
  type TicketPriority,
  type TicketSize,
  type TicketTagId,
} from "./tickets";

const BODY_ROWS = 6;

export type TicketFieldsErrors = {
  title?: string;
  body?: string;
  status?: string;
  tags?: string;
};

// The fields every ticket form carries; the edit layer adds the status itself.
export type TicketFieldValues = Pick<
  TicketEditInput,
  "title" | "body" | "size" | "priority" | "tags"
>;

const sizeOptions: SelectOption<TicketSize>[] = ticketSizes.map((size) => ({
  value: size,
  label: size,
}));

const priorityOptions: SelectOption<TicketPriority>[] = ticketPriorities.map((priority) => ({
  value: priority,
  label: messages.tickets.priorities[priority],
}));

export type TicketFieldsProps = {
  values: TicketFieldValues;
  errors: TicketFieldsErrors;
  onChange: (patch: Partial<TicketFieldValues>) => void;
  // The author's layer hides the queue fields (size and priority belong to
  // the maintainers); the composer and the maintainer's layer show them.
  hideQueueFields?: boolean;
  // A field only some forms have (the edit layer's status): it sits between the
  // priority select and the tags.
  children?: ReactNode;
};

/** The ticket form fields shared by the composer and the edit layer: title,
 * body, size, priority and tags with their errors. */
export function TicketFields({
  values,
  errors,
  onChange,
  hideQueueFields = false,
  children,
}: TicketFieldsProps) {
  function toggleTag(tag: TicketTagId) {
    onChange({
      tags: values.tags.includes(tag)
        ? values.tags.filter((current) => current !== tag)
        : [...values.tags, tag],
    });
  }

  return (
    <Stack gap={10}>
      <Field
        label={messages.tickets.compose.fields.title}
        name="title"
        value={values.title}
        onChange={(title) => onChange({ title })}
        required
        error={errors.title}
      />
      <MarkdownEditor
        label={messages.tickets.compose.fields.body}
        name="body"
        value={values.body}
        onChange={(body) => onChange({ body })}
        rows={BODY_ROWS}
        required
        error={errors.body}
      />

      {hideQueueFields ? null : (
        <>
          <Select
            label={messages.tickets.compose.fields.size}
            name="size"
            value={values.size}
            onChange={(size) => onChange({ size })}
            options={sizeOptions}
          />

          <Select
            label={messages.tickets.compose.fields.priority}
            name="priority"
            value={values.priority}
            onChange={(priority) => onChange({ priority })}
            options={priorityOptions}
          />
        </>
      )}

      {children}

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
    </Stack>
  );
}
