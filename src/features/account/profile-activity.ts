import type { Readroom } from "@/features/readroom/contracts";

export type ReadroomActivityCounts = { tasks: number; answered: number };

/** Answered counts distinct tasks with at least one active note by this member. */
export function readroomActivityCounts(
  readrooms: readonly Readroom[],
  user: string,
): ReadroomActivityCounts {
  return {
    tasks: readrooms.filter((readroom) => readroom.lead.user === user).length,
    answered: readrooms.filter((readroom) =>
      readroom.notes.some((note) => note.author.user === user),
    ).length,
  };
}
