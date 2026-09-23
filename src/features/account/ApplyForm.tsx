"use client";

import { useState } from "react";
import { Button, Form, Heading, Select, Stack, Text, Textarea } from "@swearjar/dos";
import type { ZodError } from "zod";
import { messages } from "@/content/messages";
import { applySchema, weeklyHourIds, type ApplyInput } from "./schema";

const EXPERIENCE_ROWS = 3;
const MOTIVATION_ROWS = 5;

const FIELD_KEYS = ["experience", "motivation"] as const;

type FieldErrors = Partial<Record<(typeof FIELD_KEYS)[number], string>>;

const INITIAL_VALUES: ApplyInput = {
  experience: "",
  weeklyHours: "5-10",
  motivation: "",
};

const weeklyHoursOptions = weeklyHourIds.map((id) => ({
  value: id,
  label: messages.account.apply.weeklyHours[id],
}));

function toFieldErrors(error: ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of FIELD_KEYS) {
    if (error.issues.some((issue) => issue.path[0] === key)) {
      errors[key] = messages.account.apply.errors[key];
    }
  }
  return errors;
}

export function ApplyForm({ applicant }: { applicant: string }) {
  const [values, setValues] = useState<ApplyInput>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sent, setSent] = useState(false);

  function update<K extends keyof ApplyInput>(key: K, value: ApplyInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit() {
    const parsed = applySchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    // Mock submit: applications reach the database in Phase 5.
    setSent(true);
  }

  if (sent) {
    return (
      <Stack gap={8}>
        <Heading level={1}>{messages.account.apply.receipt.heading}</Heading>
        <Text>{messages.account.apply.receipt.text}</Text>
        <Text role="hint">
          {messages.account.apply.receipt.applicant}: {applicant}
        </Text>
        <Text role="hint">{messages.account.apply.receipt.hint}</Text>
      </Stack>
    );
  }

  return (
    <Form onSubmit={handleSubmit} ariaLabel={messages.account.apply.heading}>
      <Stack gap={10}>
        <Heading level={1}>{messages.account.apply.heading}</Heading>
        <Text>{messages.account.apply.intro}</Text>
        <Text role="hint">{messages.account.apply.hint}</Text>

        <Text role="hint">
          {messages.account.apply.fields.applicant}: {applicant}
        </Text>
        <Select
          label={messages.account.apply.fields.weeklyHours}
          name="weeklyHours"
          value={values.weeklyHours}
          onChange={(weeklyHours) => update("weeklyHours", weeklyHours)}
          options={weeklyHoursOptions}
        />
        <Textarea
          label={messages.account.apply.fields.experience}
          name="experience"
          value={values.experience}
          onChange={(experience) => update("experience", experience)}
          rows={EXPERIENCE_ROWS}
          error={errors.experience}
        />
        <Textarea
          label={messages.account.apply.fields.motivation}
          name="motivation"
          value={values.motivation}
          onChange={(motivation) => update("motivation", motivation)}
          rows={MOTIVATION_ROWS}
          required
          error={errors.motivation}
        />

        <Stack direction="row" gap={10}>
          <Button type="submit" variant="primary">
            {messages.account.apply.submit}
          </Button>
        </Stack>
      </Stack>
    </Form>
  );
}
