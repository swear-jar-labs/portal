"use client";

import { useEffect } from "react";
import { buildReadroomOpenedEvents, enqueueInboxEvent } from "@/features/inbox/contracts";
import { readroomPath } from "../model/readrooms";

export type ReadroomOpeningInput = {
  readroomId: string;
  taskTitle: string;
  deadlineAt: string;
  noteAuthors: readonly string[];
};

// The deadline has no mock action behind it — time passes, nobody clicks — so
// the viewing layer is its only observer. The clock reads live (this hook is
// client-only; the page's frozen `now` stamp would miss a crossing on an open
// screen), the stable event id plus this session guard keep the opening
// exactly once per mock session, and the notice names the task only: no note
// text or preview travels before the deadline.
const delivered = new Set<string>();

export function useReadroomOpeningNotifier(input: ReadroomOpeningInput): void {
  const { readroomId, taskTitle, deadlineAt, noteAuthors } = input;
  const authorsKey = JSON.stringify([...noteAuthors].sort());
  useEffect(() => {
    if (Date.now() < Date.parse(deadlineAt)) return;
    if (delivered.has(readroomId)) return;
    delivered.add(readroomId);
    const at = new Date().toISOString();
    for (const delivery of buildReadroomOpenedEvents({
      readroomId,
      taskTitle,
      noteAuthors,
      target: { kind: "readroom", label: taskTitle, href: readroomPath(readroomId) },
      at,
    }))
      enqueueInboxEvent(delivery.user, delivery.event);
  }, [authorsKey, deadlineAt, noteAuthors, readroomId, taskTitle]);
}

/** Test seam: let the next mount deliver again. */
export function resetReadroomOpeningForTests(): void {
  delivered.clear();
}
