"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Heading, Select, Stack, Text, Textarea } from "@swearjar/dos";
import type { ZodError } from "zod";
import { messages } from "@/content/messages";
import { ApplicationHistory } from "./ApplicationHistory";
import type { MemberApplication } from "./applications";
import {
  mockRespondToMemberApplication,
  mockSubmitMemberApplication,
} from "./mock-application-actions";
import { applySchema, weeklyHourIds, type ApplyInput } from "./schema";
import styles from "./ApplyForm.module.css";

const EXPERIENCE_ROWS = 3;
const MOTIVATION_ROWS = 5;
const FIELD_KEYS = ["experience", "motivation"] as const;
type FieldErrors = Partial<Record<(typeof FIELD_KEYS)[number], string>>;

const INITIAL_VALUES: ApplyInput = { experience: "", weeklyHours: "5-10", motivation: "" };
const copy = messages.account.apply;
const weeklyHoursOptions = weeklyHourIds.map((id) => ({ value: id, label: copy.weeklyHours[id] }));

function subscribeHydration() {
  return () => {};
}

function clientInteractive() {
  return true;
}

function serverInteractive() {
  return false;
}

function toFieldErrors(error: ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of FIELD_KEYS) {
    if (error.issues.some((issue) => issue.path[0] === key)) errors[key] = copy.errors[key];
  }
  return errors;
}

export function ApplyForm({
  applicant,
  applications,
}: {
  applicant: string;
  applications: MemberApplication[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<ApplyInput>(INITIAL_VALUES);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [actionError, setActionError] = useState("");
  const [pending, startTransition] = useTransition();
  const interactive = useSyncExternalStore(
    subscribeHydration,
    clientInteractive,
    serverInteractive,
  );
  const latest = applications.at(-1);

  // Server-rendered forms have no submit handler until hydration. Keep their
  // controls disabled so an early click cannot turn the mock action into a
  // native GET request with the draft in the URL.

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
    setActionError("");
    startTransition(async () => {
      const result = await mockSubmitMemberApplication(parsed.data);
      if (!result.ok) {
        setActionError(copy.actionErrors[result.error]);
        return;
      }
      router.refresh();
    });
  }

  function handleResponse() {
    if (!latest || latest.status !== "needs-info") return;
    setActionError("");
    startTransition(async () => {
      const result = await mockRespondToMemberApplication({
        id: latest.id,
        version: latest.version,
        note,
      });
      if (!result.ok) {
        setActionError(copy.actionErrors[result.error]);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <Stack gap={12}>
      <Heading level={1}>{copy.heading}</Heading>
      <Text role="hint">
        {copy.fields.applicant}: {applicant}
      </Text>

      {latest?.status === "pending" ? (
        <Text>{copy.states.pending}</Text>
      ) : latest?.status === "needs-info" ? (
        <Form onSubmit={handleResponse} ariaLabel={copy.response.heading}>
          <fieldset className={styles.fields} disabled={!interactive}>
            <Stack gap={8}>
              <Text>{copy.states.needsInfo}</Text>
              <Textarea
                label={copy.response.label}
                name="clarification"
                value={note}
                onChange={setNote}
                rows={MOTIVATION_ROWS}
                required
              />
              <Button type="submit" variant="primary" disabled={pending}>
                {copy.response.submit}
              </Button>
            </Stack>
          </fieldset>
        </Form>
      ) : (
        <Form onSubmit={handleSubmit} ariaLabel={copy.heading}>
          <fieldset className={styles.fields} disabled={!interactive}>
            <Stack gap={10}>
              {latest?.status === "rejected" ? <Text>{copy.states.rejected}</Text> : null}
              <Text>{copy.intro}</Text>
              <Text role="hint">{copy.hint}</Text>
              <Select
                label={copy.fields.weeklyHours}
                name="weeklyHours"
                value={values.weeklyHours}
                onChange={(weeklyHours) => update("weeklyHours", weeklyHours)}
                options={weeklyHoursOptions}
              />
              <Textarea
                label={copy.fields.experience}
                name="experience"
                value={values.experience}
                onChange={(experience) => update("experience", experience)}
                rows={EXPERIENCE_ROWS}
                error={errors.experience}
              />
              <Textarea
                label={copy.fields.motivation}
                name="motivation"
                value={values.motivation}
                onChange={(motivation) => update("motivation", motivation)}
                rows={MOTIVATION_ROWS}
                required
                error={errors.motivation}
              />
              <Button type="submit" variant="primary" disabled={pending}>
                {latest ? copy.reapply : copy.submit}
              </Button>
            </Stack>
          </fieldset>
        </Form>
      )}

      {actionError ? <Text role="danger">{actionError}</Text> : null}
      <ApplicationHistory applications={applications} />
    </Stack>
  );
}
