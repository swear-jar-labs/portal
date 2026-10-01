"use client";

import { useEffect, useState } from "react";
import { Button, Checkbox, Form, Heading, Select, Stack } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { isScreensaverDelayMinutes, screensaverDelayMinutes } from "@/content/settings";
import { plural } from "@/lib/plural";
import {
  defaultNotificationPrefs,
  notificationToggleKinds,
  useNotificationPrefs,
  type NotificationPrefs,
} from "./notification-prefs";
import { useScreensaverPrefs, type ScreensaverPrefs } from "./screensaver-prefs";

const delayOptions = screensaverDelayMinutes.map((minutes) => ({
  value: String(minutes),
  label: `${minutes} ${plural(minutes, pluralForms.minute)}`,
}));

export function SettingsForm({ user }: { user: string }) {
  const prefs = useScreensaverPrefs((state) => state.prefs);
  const setPrefs = useScreensaverPrefs((state) => state.setPrefs);
  // Edits land in a local draft and are applied (and stored) by SAVE only.
  // Draft null means "nothing edited yet", so hydration and reloads win.
  const [draft, setDraft] = useState<ScreensaverPrefs | null>(null);

  const notifyBoxes = useNotificationPrefs((state) => state.boxes);
  const setNotifyPrefs = useNotificationPrefs((state) => state.setPrefs);
  const hydrateNotifyPrefs = useNotificationPrefs((state) => state.hydrate);
  useEffect(() => {
    hydrateNotifyPrefs();
  }, [hydrateNotifyPrefs]);
  const [notifyDraft, setNotifyDraft] = useState<NotificationPrefs | null>(null);

  const values = draft ?? prefs;
  const saverDirty = values.enabled !== prefs.enabled || values.delayMinutes !== prefs.delayMinutes;

  const storedNotify = notifyBoxes[user] ?? defaultNotificationPrefs;
  const notifyValues = notifyDraft ?? storedNotify;
  const notifyDirty = notificationToggleKinds.some(
    (kind) => notifyValues[kind] !== storedNotify[kind],
  );
  const dirty = saverDirty || notifyDirty;

  function edit(next: ScreensaverPrefs) {
    setDraft(next);
  }

  function editNotify(next: NotificationPrefs) {
    setNotifyDraft(next);
  }

  function updateDelay(value: string) {
    const minutes = Number(value);
    if (!isScreensaverDelayMinutes(minutes)) return;
    edit({ ...values, delayMinutes: minutes });
  }

  function save() {
    // Enter inside a field submits the form: without edits there is nothing to save.
    if (!dirty) return;
    if (saverDirty) setPrefs(values);
    if (notifyDirty) setNotifyPrefs(user, notifyValues);
    setDraft(null);
    setNotifyDraft(null);
  }

  return (
    <Form onSubmit={save} ariaLabel={messages.account.settings.heading}>
      <Stack gap={12}>
        <Stack gap={8}>
          <Heading level={2}>{messages.account.settings.notifications.heading}</Heading>
          {notificationToggleKinds.map((kind) => (
            <Checkbox
              key={kind}
              label={messages.account.settings.notifications[kind]}
              name={`notify-${kind}`}
              checked={notifyValues[kind]}
              onChange={(enabled) => editNotify({ ...notifyValues, [kind]: enabled })}
            />
          ))}
        </Stack>

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

        <Stack direction="row" gap={10} align="center" wrap>
          <Button type="submit" variant="primary" disabled={!dirty}>
            {messages.account.settings.save}
          </Button>
        </Stack>
      </Stack>
    </Form>
  );
}
