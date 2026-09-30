"use client";

import { useEffect } from "react";
import { buildReadroomOpenedEvents, enqueueInboxEvent } from "@/features/inbox/contracts";
import { readroomPath } from "../model/readrooms";

export type ReadroomOpeningInput = {
  readroomId: string;
  taskTitle: string;
  deadlineAt: string;
  now: string;
  noteAuthors: readonly string[];
};

// The deadline has no mock action behind it — time passes, nobody clicks — so
// the viewing layer is its only observer. The stable event id plus this
// session guard keep the opening exactly once per mock session, and the notice
// names the task only: no note text or preview travels before the deadline.
const delivered = new Set<string>();

export function useReadroomOpeningNotifier(input: ReadroomOpeningInput): void {
  const { readroomId, taskTitle, deadlineAt, now, noteAuthors } = input;
  const authorsKey = noteAuthors.join("\u0000");
  useEffect(() => {
    if (Date.parse(now) < Date.parse(deadlineAt)) return;
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
  }, [authorsKey, deadlineAt, noteAuthors, now, readroomId, taskTitle]);
}

/** Test seam: let the next mount deliver again. */
export function resetReadroomOpeningForTests(): void {
  delivered.clear();
}
