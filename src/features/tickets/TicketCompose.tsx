"use client";

import { useState } from "react";
import { Button, Form, Heading, Select, Stack, Text, type SelectOption } from "@swearjar/dos";
import { messages } from "@/content/messages";
import type { ProjectSlug } from "@/features/projects/contracts";
import { DEFAULT_TICKET_PROJECT } from "./tickets";
import { makeTicketComposeSchema, type TicketComposeInput } from "./schema";
import { TicketFields, type TicketFieldsErrors } from "./TicketFields";
import type { TicketProjectOption } from "./TicketsFeed";

/** The new-ticket layer: project, title, size, priority, tags and the opening
 * body. A project entry preselects its project but keeps the same editable form
 * as the tracker. A mock submit until the tickets have a backend (the ticket
 * lives in the session). */
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
    priority: "normal",
    tags: [],
  });
  const [errors, setErrors] = useState<TicketFieldsErrors>({});

  function update(patch: Partial<TicketComposeInput>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  function handleSubmit() {
    const parsed = makeTicketComposeSchema(projects.map((project) => project.slug)).safeParse(
      values,
    );
    if (!parsed.success) {
      const hasError = (field: keyof TicketFieldsErrors) =>
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
          onChange={(project) => update({ project })}
          options={projectOptions}
        />

        <TicketFields values={values} errors={errors} onChange={update} />

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
