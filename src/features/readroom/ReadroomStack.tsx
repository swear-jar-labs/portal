"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { CloseButton, Stack } from "@swearjar/dos";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import {
  overlayLayerPanels,
  PanelStack,
  ShellPanel,
  stackMemory,
  useLoginPrompt,
  useOverlayPush,
  useOverlayTop,
  useShellSession,
} from "@/features/shell";
import { useMergedTickets, type Ticket } from "@/features/tickets/contracts";
import { Markdown } from "@/shared/Markdown/Markdown";
import { avatarFor } from "@/shared/members";
import type { ReadroomDraft } from "./datetime";
import { READROOM_PATH, readroomPath, type Readroom } from "./readrooms";
import { createReadroom } from "./readroom-store";
import { useReadroomSession } from "./useReadroomSession";
import { ReadroomComposePanel } from "./ReadroomComposePanel";
import { ReadroomFeed, readroomComposeButtonId } from "./ReadroomFeed";
import { ReadroomSourceRow } from "./ReadroomSourceRow";
import { ReadroomView } from "./ReadroomView";
import { readroomCardId } from "./ReadroomCard";

export type ReadroomLayer = {
  id: string;
  title: string;
  // The task's panel body, rendered in RSC (Markdown stays out of the client
  // bundle) and slotted into the panel chrome here.
  layer: ReactNode;
};

export type ReadroomStackProps = {
  readrooms: readonly Readroom[];
  // The ticket queue for the compose layer's ticket picker: fixtures from the
  // RSC render, merged with the session's tickets below.
  tickets: readonly Ticket[];
  // The product repos by slug for the compose layer's source suggestions.
  projectRepos: Readonly<Record<string, string>>;
  // The ranking base captured by the RSC render: server and client rank
  // identically at hydration.
  now: string;
  task?: ReadroomLayer;
};

export function ReadroomStack({ readrooms, tickets, projectRepos, now, task }: ReadroomStackProps) {
  const router = useRouter();
  const pushOverlay = useOverlayPush();
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const { state, readrooms: visible } = useReadroomSession(readrooms);
  const allTickets = useMergedTickets(tickets);
  const [composing, setComposing] = useState(false);
  const [localTaskId, setLocalTaskId] = useState<string | null>(null);
  // The control a closed layer owes focus to (the compose button, a new card).
  const returnFocusRef = useRef<string | null>(null);
  // A close owns the navigation until the route changes: a second Esc landing
  // in that window must not pop another layer.
  const closingRef = useRef(false);
  // The stack claims the overlay host role while mounted (the fallback host
  // yields) and renders the store layers as the top of this PanelStack.
  const { overlayLayers, overlayOpen, closeOverlay } = useOverlayTop(closingRef);

  const localTask = useMemo(
    () =>
      localTaskId === null
        ? null
        : (state.addedReadrooms.find((entry) => entry.id === localTaskId) ?? null),
    [localTaskId, state.addedReadrooms],
  );

  const localTaskIds = useMemo(
    () => new Set(state.addedReadrooms.map((entry) => entry.id)),
    [state.addedReadrooms],
  );

  // A new top layer (or the feed) ends the close that was in flight.
  useEffect(() => {
    closingRef.current = false;
  }, [overlayLayers, task?.id, composing, localTaskId]);

  // After the direct-load layer pops, focus returns to the card that opened
  // it: the request crosses the page remount in the SPA session memory, and
  // a local close (state change, no remount) runs the same effect on the id
  // change (the overlay focus return lives in the shared hook).
  useEffect(() => {
    const id = stackMemory.takePendingCardFocus();
    if (id === null) return;
    const card = document.getElementById(readroomCardId(id));
    card?.focus();
    card?.scrollIntoView({ block: "nearest" });
  }, [localTaskId]);

  // The compose layer hands focus back to the control that opened it.
  useEffect(() => {
    if (composing) return;
    const id = returnFocusRef.current;
    if (id === null) return;
    returnFocusRef.current = null;
    const target = document.getElementById(id) ?? document.getElementById(readroomComposeButtonId);
    target?.focus();
  }, [composing]);

  // The guest gate: an action that needs a member prompts for logon instead.
  const gate = useCallback(
    (action: () => void) => {
      if (session === null) {
        requestLogin();
        return;
      }
      action();
    },
    [requestLogin, session],
  );

  const activateTask = useCallback(
    (id: string, event?: MouseEvent<HTMLElement>) => {
      // A composed task has no route to navigate to (and no link in its card):
      // it opens in place. Keep the native behavior for real routes.
      if (localTaskIds.has(id)) {
        setLocalTaskId(id);
        return;
      }
      // The root slot intercepts the task above the current stack: the card
      // stays mounted and returns focus when the overlay peels.
      pushOverlay(readroomPath(id), readroomCardId(id))(event);
    },
    [localTaskIds, pushOverlay],
  );

  const closeTask = useCallback(() => {
    if (!task) return;
    if (closingRef.current) return;
    closingRef.current = true;
    stackMemory.requestCardFocus(task.id);
    // Direct-load only (an overlay task peels with browser back instead).
    if (stackMemory.takePushedFrom(window.location.pathname)) router.back();
    else router.push(READROOM_PATH);
  }, [router, task]);

  const closeLocalTask = useCallback(() => {
    if (localTask === null) return;
    stackMemory.requestCardFocus(localTask.id);
    setLocalTaskId(null);
  }, [localTask]);

  // UI-first: any member may open the composer; the reviewer+ rule arrives
  // with roles in Phase 5 (a gating test comes with it).
  const openCompose = useCallback(() => {
    gate(() => setComposing(true));
  }, [gate]);

  const closeCompose = useCallback(() => {
    returnFocusRef.current = readroomComposeButtonId;
    setComposing(false);
  }, []);

  const submitCompose = useCallback(
    (draft: ReadroomDraft) => {
      if (session === null) {
        requestLogin();
        return;
      }
      const created = createReadroom(draft, {
        user: session.user,
        avatar: avatarFor(session.user),
      });
      setComposing(false);
      setLocalTaskId(created.id);
    },
    [requestLogin, session],
  );

  const closeTop = useCallback(() => {
    if (overlayOpen) {
      closeOverlay();
      return;
    }
    if (composing) {
      closeCompose();
      return;
    }
    if (localTask !== null) {
      closeLocalTask();
      return;
    }
    closeTask();
  }, [closeCompose, closeLocalTask, closeOverlay, closeTask, composing, localTask, overlayOpen]);

  return (
    <PanelStack onCloseTop={closeTop}>
      <ShellPanel title={fileTitle("READROOM")}>
        <ReadroomFeed
          readrooms={visible}
          now={now}
          currentId={task?.id ?? localTask?.id}
          localReadroomIds={localTaskIds}
          onActivate={activateTask}
          onCompose={openCompose}
        />
      </ShellPanel>
      {task ? (
        <ShellPanel
          title={task.title}
          actions={<CloseButton onClose={closeTask} label={messages.shell.window.closeLabel} />}
        >
          {task.layer}
        </ShellPanel>
      ) : null}
      {localTask ? (
        <ShellPanel
          title={localTask.title}
          actions={
            <CloseButton onClose={closeLocalTask} label={messages.shell.window.closeLabel} />
          }
        >
          <Stack gap={12}>
            <ReadroomSourceRow readroom={localTask} />
            <ReadroomView
              readroom={localTask}
              tickets={tickets}
              now={now}
              description={<Markdown>{localTask.description}</Markdown>}
              noteBodies={{}}
            />
          </Stack>
        </ShellPanel>
      ) : null}
      {composing ? (
        <ShellPanel
          title={messages.readroom.compose.title}
          surface="light"
          actions={
            <CloseButton onClose={() => closeCompose()} label={messages.shell.window.closeLabel} />
          }
        >
          <ReadroomComposePanel
            tickets={allTickets}
            projectRepos={projectRepos}
            onSubmit={submitCompose}
            onCancel={() => closeCompose()}
          />
        </ShellPanel>
      ) : null}
      {overlayLayerPanels(overlayLayers, closeOverlay)}
    </PanelStack>
  );
}
