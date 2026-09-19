"use client";

import { useCallback, useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CloseButton } from "@swearjar/dos";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { isPlainActivation } from "@/lib/activation";
import { PanelStack, ShellPanel, stackMemory } from "@/features/shell";
import { READROOM_PATH, readroomPath, type Readroom } from "./readrooms";
import { ReadroomFeed } from "./ReadroomFeed";
import { readroomCardId } from "./ReadroomCard";
import { useReadroomLayer } from "./ReadroomLayerContext";

export type ReadroomLayer = {
  id: string;
  title: string;
  // The task's panel body, rendered in RSC (Markdown stays out of the client
  // bundle) and slotted into the panel chrome here.
  layer: ReactNode;
};

export type ReadroomStackProps = {
  readrooms: readonly Readroom[];
  // The ranking base captured by the RSC render: server and client rank
  // identically at hydration.
  now: string;
  task?: ReadroomLayer;
};

export function ReadroomStack({ readrooms, now, task }: ReadroomStackProps) {
  const router = useRouter();
  const routedMemberLayer = useReadroomLayer();
  // A close owns the navigation until the route changes: a second Esc landing
  // in that window must not pop another layer.
  const closingRef = useRef(false);
  const memberLayerOpen = routedMemberLayer !== null;
  const wasMemberLayerOpen = useRef(memberLayerOpen);

  // A new top layer (or the feed) ends the close that was in flight.
  useEffect(() => {
    closingRef.current = false;
  }, [memberLayerOpen, task?.id]);

  // After the layer pops, focus returns to the card that opened it: the request
  // crosses the page remount in the SPA session memory.
  useEffect(() => {
    const id = stackMemory.takePendingCardFocus();
    if (id === null) return;
    const card = document.getElementById(readroomCardId(id));
    card?.focus();
    card?.scrollIntoView({ block: "nearest" });
  }, []);

  // Unlike a task route, an intercepted profile keeps this ReadroomStack and
  // its author link mounted. The known id can therefore receive focus as soon
  // as the profile slot disappears.
  useEffect(() => {
    const closed = !memberLayerOpen && wasMemberLayerOpen.current;
    wasMemberLayerOpen.current = memberLayerOpen;
    if (!closed) return;
    const id = stackMemory.takePendingMemberFocus();
    if (id) document.getElementById(id)?.focus();
  }, [memberLayerOpen]);

  const activateTask = useCallback(
    (id: string, event?: MouseEvent<HTMLElement>) => {
      if (!isPlainActivation(event)) return;
      event?.preventDefault();
      const route = readroomPath(id);
      stackMemory.rememberPush(route);
      router.push(route);
    },
    [router],
  );

  const closeTask = useCallback(() => {
    if (!task) return;
    if (closingRef.current) return;
    closingRef.current = true;
    stackMemory.requestCardFocus(task.id);
    // Only the route we pushed has the feed behind it in history; a deep-linked
    // task closes by pushing the feed.
    if (stackMemory.wasPushedFrom(window.location.pathname)) router.back();
    else router.push(READROOM_PATH);
  }, [router, task]);

  const closeMember = useCallback(() => {
    if (!memberLayerOpen) return;
    if (closingRef.current) return;
    closingRef.current = true;
    // An intercepted profile is only reached from a plain in-app activation.
    // A fallback preserves the task when an unusual router history omits it.
    if (stackMemory.wasMemberPushedFrom(window.location.pathname)) router.back();
    else router.push(task ? readroomPath(task.id) : READROOM_PATH);
  }, [memberLayerOpen, router, task]);

  const closeTop = useCallback(() => {
    if (memberLayerOpen) {
      closeMember();
      return;
    }
    closeTask();
  }, [closeMember, closeTask, memberLayerOpen]);

  return (
    <PanelStack onCloseTop={closeTop}>
      <ShellPanel title={fileTitle("READROOM")}>
        <ReadroomFeed
          readrooms={readrooms}
          now={now}
          currentId={task?.id}
          onActivate={activateTask}
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
      {memberLayerOpen ? (
        <ShellPanel
          title={messages.members.panelTitle}
          actions={<CloseButton onClose={closeMember} label={messages.shell.window.closeLabel} />}
        >
          {routedMemberLayer}
        </ShellPanel>
      ) : null}
    </PanelStack>
  );
}
