"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CloseButton, Stack } from "@swearjar/dos";
import { messages } from "@/content/messages";
import type { ThreadSummary } from "@/features/board/contracts";
import { PanelStack, ShellPanel } from "@/features/shell";
import { ApplicationHistory } from "./ApplicationHistory";
import type { MemberApplication } from "./applications";
import type { MemberProfile } from "./data";
import { ProfileEditForm } from "./ProfileEditForm";
import { ProfileView } from "./ProfileView";

export function ProfileStack({
  profile,
  threads,
  now,
  applications,
  title,
}: {
  profile: MemberProfile;
  threads: readonly ThreadSummary[];
  now: string;
  applications: readonly MemberApplication[];
  title: string;
}) {
  const editButtonId = useId();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!editing && restoreFocus.current) {
      document.getElementById(editButtonId)?.focus();
      restoreFocus.current = false;
    }
  }, [editing, editButtonId]);

  function close() {
    restoreFocus.current = true;
    setEditing(false);
  }

  function requestClose() {
    if (!busy) close();
  }

  return (
    <PanelStack onCloseTop={editing ? requestClose : undefined}>
      <ShellPanel title={title} closable>
        <Stack gap={12}>
          <ProfileView
            profile={profile}
            threads={threads}
            now={now}
            editButtonId={editButtonId}
            saved={saved}
            onEdit={() => {
              setSaved(false);
              setEditing(true);
            }}
          />
          <ApplicationHistory applications={applications} />
        </Stack>
      </ShellPanel>
      {editing ? (
        <ShellPanel
          title={messages.account.profile.edit.heading}
          actions={<CloseButton onClose={requestClose} label={messages.shell.window.closeLabel} />}
        >
          <ProfileEditForm
            profile={profile}
            onCancel={requestClose}
            onBusyChange={setBusy}
            onSaved={() => {
              setSaved(true);
              close();
            }}
          />
        </ShellPanel>
      ) : null}
    </PanelStack>
  );
}
