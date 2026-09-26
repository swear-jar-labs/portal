import { describe, expect, it } from "vitest";
import { readroomActivityCounts } from "@/features/account/profile-activity";
import type { Readroom } from "@/features/readroom/readrooms";
import {
  deleteNote,
  readroomSnapshot,
  resetReadroomStore,
  withSession,
} from "@/features/readroom/readroom-store";

function task(id: string, lead: string, responders: readonly string[]): Readroom {
  return {
    id,
    title: id,
    tags: [],
    upvotes: [],
    description: "Read this",
    lead: { user: lead },
    createdAt: "2026-09-20T00:00:00.000Z",
    deadlineAt: "2026-09-30T00:00:00.000Z",
    notes: responders.map((user, index) => ({
      id: `${id}-${index}`,
      author: { user },
      body: "Note",
      createdAt: "2026-09-21T00:00:00.000Z",
    })),
  };
}

describe("readroom activity", () => {
  it("counts created tasks and distinct tasks with active notes", () => {
    const tasks = [
      task("owned", "ada", ["ada", "ada"]),
      task("answered", "ken", ["ada", "lin"]),
      task("other", "ken", ["lin"]),
    ];
    expect(readroomActivityCounts(tasks, "ada")).toEqual({ tasks: 1, answered: 2 });
    expect(readroomActivityCounts(tasks, "lin")).toEqual({ tasks: 0, answered: 2 });
  });

  it("drops a task from answered when its last note is deleted", () => {
    resetReadroomStore();
    const tasks = [task("answered", "ken", ["ada"])];
    expect(readroomActivityCounts(withSession(tasks, readroomSnapshot()), "ada").answered).toBe(1);
    deleteNote("answered", "answered-0");
    expect(readroomActivityCounts(withSession(tasks, readroomSnapshot()), "ada").answered).toBe(0);
  });
});
