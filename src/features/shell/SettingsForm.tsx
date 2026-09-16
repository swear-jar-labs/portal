"use client";

import { useState } from "react";
import { Button, Checkbox, Form, Heading, Select, Stack, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { isScreensaverDelayMinutes, screensaverDelayMinutes } from "@/content/settings";
import { plural } from "@/lib/plural";
import { useScreensaverPrefs, type ScreensaverPrefs } from "./screensaver-prefs";

const delayOptions = screensaverDelayMinutes.map((minutes) => ({
  value: String(minutes),
  label: `${minutes} ${plural(minutes, pluralForms.minute)}`,
}));

export function SettingsForm() {
  const prefs = useScreensaverPrefs((state) => state.prefs);
  const setPrefs = useScreensaverPrefs((state) => state.setPrefs);
  // Edits land in a local draft and are applied (and stored) by SAVE only.
  // Draft null means "nothing edited yet", so hydration and reloads win.
  const [draft, setDraft] = useState<ScreensaverPrefs | null>(null);
  const [saved, setSaved] = useState(false);

  const values = draft ?? prefs;
  const dirty = values.enabled !== prefs.enabled || values.delayMinutes !== prefs.delayMinutes;

  function edit(next: ScreensaverPrefs) {
    setDraft(next);
    setSaved(false);
  }

  function updateDelay(value: string) {
    const minutes = Number(value);
    if (!isScreensaverDelayMinutes(minutes)) return;
    edit({ ...values, delayMinutes: minutes });
  }

  function save() {
    // Enter inside a field submits the form: without edits there is nothing to save.
    if (!dirty) return;
    setPrefs(values);
    setDraft(null);
    setSaved(true);
  }

  return (
    <Form onSubmit={save} ariaLabel={messages.account.settings.heading}>
      <Stack gap={12}>
        <Heading level={1} tone="yellow">
          {messages.account.settings.heading}
        </Heading>

        <Stack gap={8}>
          <Heading level={2}>{messages.account.settings.screensaver.heading}</Heading>
          <Checkbox
            label={messages.account.settings.screensaver.enabled}
            name="screensaverEnabled"
            checked={values.enabled}
            onChange={(enabled) => edit({ ...values, enabled })}
          />
          <Select
            label={messages.account.settings.screensaver.delay}
            name="screensaverDelay"
            value={String(values.delayMinutes)}
            onChange={updateDelay}
            options={delayOptions}
          />
        </Stack>

        <Text tone="dim">{messages.account.settings.hint}</Text>

        <Stack direction="row" gap={10} align="center" wrap>
          <Button type="submit" variant="primary" disabled={!dirty}>
            {messages.account.settings.save}
          </Button>
          {saved ? <Text tone="green">{messages.account.settings.saved}</Text> : null}
        </Stack>
      </Stack>
    </Form>
  );
}
