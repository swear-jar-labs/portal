"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CloseButton, Stack } from "@swearjar/dos";
import { messages } from "@/content/messages";
import type { ForumActivitySeed, ThreadSummary } from "@/features/board/contracts";
import type { Readroom } from "@/features/readroom/contracts";
import type { Ticket } from "@/features/tickets/contracts";
import { overlayLayerPanels, PanelStack, ShellPanel, useOverlayTop } from "@/features/shell";
import { ApplicationHistory } from "../applications/ApplicationHistory";
import type { MemberApplication } from "../model/applications";
import type { MemberProfile } from "../data/queries";
import { ProfileEditForm } from "./ProfileEditForm";
import { ProfileView } from "./ProfileView";

export function ProfileStack({
  profile,
  threads,
  forumSeed,
  tickets,
  readrooms,
  user,
  now,
  applications,
  title,
}: {
  profile: MemberProfile;
  threads: readonly ThreadSummary[];
  forumSeed: ForumActivitySeed;
  tickets: readonly Ticket[];
  readrooms: readonly Readroom[];
  user: string;
  now: string;
  applications: readonly MemberApplication[];
  title: string;
}) {
  const editButtonId = useId();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const restoreFocus = useRef(false);
  // A close owns the navigation until the route changes: a second Esc (or [X])
  // landing in that window must not pop another layer.
  const closingRef = useRef(false);
  // The stack claims the overlay host role while mounted (the fallback host
  // yields) and renders the store layers as the top of this PanelStack.
  const { overlayLayers, overlayOpen, closeOverlay } = useOverlayTop(closingRef);

  useEffect(() => {
    closingRef.current = false;
  }, [editing, overlayLayers]);

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
    <PanelStack onCloseTop={overlayOpen ? closeOverlay : editing ? requestClose : undefined}>
      <ShellPanel title={title} closable>
        <Stack gap={12}>
          <ProfileView
            profile={profile}
            threads={threads}
            forumSeed={forumSeed}
            tickets={tickets}
            readrooms={readrooms}
            user={user}
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
      {overlayLayerPanels(overlayLayers, closeOverlay)}
    </PanelStack>
  );
}
