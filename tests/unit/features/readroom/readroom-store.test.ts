import { beforeEach, describe, expect, it } from "vitest";
import type { Readroom, ReadroomAttachment, ReadroomNote } from "@/features/readroom/readrooms";
import {
  addAttachments,
  addNote,
  createReadroom,
  deleteNote,
  editNote,
  moveDeadline,
  publishReport,
  readroomSnapshot,
  readroomStateOf,
  removeAttachment,
  resetReadroomStore,
  sessionReadroom,
  stopReadroom,
  withSession,
} from "@/features/readroom/readroom-store";
import type { ReadroomDraft } from "@/features/readroom/datetime";

const DEADLINE = "2026-09-27T18:00:00.000Z";
const MOVED = "2026-10-04T18:00:00.000Z";

function note(id: string, user: string, body = "original"): ReadroomNote {
  return { id, author: { user }, body, createdAt: "2026-09-19T12:00:00.000Z" };
}

function file(id: string, name = "snippet.c"): ReadroomAttachment {
  return { id, name, size: 42, url: `blob:mock/${id}` };
}

function readroom(overrides: Partial<Readroom> = {}): Readroom {
  return {
    id: "task",
    title: "Task",
    tags: [],
    description: "Description",
    lead: { user: "ada" },
    createdAt: "2026-09-19T12:00:00.000Z",
    deadlineAt: DEADLINE,
    notes: [],
    ...overrides,
  };
}

const draft: ReadroomDraft = {
  title: "Read the parser",
  tags: ["c"],
  description: "Where the table lies.",
  attachments: [],
  deadlineAt: DEADLINE,
};

beforeEach(() => {
  resetReadroomStore();
});

describe("sessionReadroom", () => {
  it("returns the base object while the task is untouched", () => {
    const base = readroom();
    expect(sessionReadroom(base, readroomSnapshot())).toBe(base);
  });

  it("appends session notes and applies edits without touching the base", () => {
    const base = readroom({ notes: [note("n1", "ken")] });
    addNote(base.id, "mine", { user: "ada" });
    const effective = sessionReadroom(base, readroomSnapshot());
    expect(effective.notes.map((entry) => entry.id)).toEqual([
      "n1",
      expect.stringMatching(/^local-note-/),
    ]);

    editNote(base.id, "n1", "edited");
    const edited = sessionReadroom(base, readroomSnapshot());
    expect(edited.notes[0]?.body).toBe("edited");
    expect(base.notes[0]?.body).toBe("original");
  });

  it("drops a deleted note from the effective task, the base untouched", () => {
    const base = readroom({ notes: [note("n1", "ken"), note("n2", "ada")] });
    const mine = addNote(base.id, "mine", { user: "lin" });
    deleteNote(base.id, "n1");
    deleteNote(base.id, mine.id);

    const effective = sessionReadroom(base, readroomSnapshot());
    expect(effective.notes.map((entry) => entry.id)).toEqual(["n2"]);
    expect(base.notes.map((entry) => entry.id)).toEqual(["n1", "n2"]);
  });

  it("overlays the report, the moved deadline and the stop", () => {
    const base = readroom();
    publishReport(base.id, "## What the code does");
    moveDeadline(base.id, MOVED);
    stopReadroom(base.id);

    const effective = sessionReadroom(base, readroomSnapshot());
    expect(effective.report).toBe("## What the code does");
    expect(effective.reportAt).toBeDefined();
    expect(effective.deadlineAt).toBe(MOVED);
    expect(effective.archivedAt).toBeDefined();
    expect(base.report).toBeUndefined();
    expect(base.deadlineAt).toBe(DEADLINE);
  });

  it("defaults the task state of an untouched task", () => {
    expect(readroomStateOf(readroomSnapshot(), "task").addedNotes).toEqual([]);
    expect(readroomStateOf(readroomSnapshot(), "task").noteEdits.size).toBe(0);
    expect(readroomStateOf(readroomSnapshot(), "task").attachments).toEqual([]);
  });
});

describe("attachments", () => {
  it("attaches and removes files in session order", () => {
    const snapshot = () => readroomStateOf(readroomSnapshot(), "task");
    addAttachments("task", [file("f1"), file("f2", "table.txt")]);
    expect(snapshot().attachments.map((entry) => entry.name)).toEqual(["snippet.c", "table.txt"]);

    removeAttachment("task", "f1");
    expect(snapshot().attachments.map((entry) => entry.id)).toEqual(["f2"]);
  });

  it("keeps an empty batch out of the state", () => {
    addAttachments("task", []);
    expect(readroomSnapshot().tasks).toEqual({});
  });
});

describe("createReadroom", () => {
  it("opens a collecting task led by its author, visible to the feed", () => {
    const created = createReadroom(draft, { user: "ada" });
    expect(created.id).toMatch(/^local-readroom-/);
    expect(created.lead).toEqual({ user: "ada" });
    expect(created.tags).toEqual(["c"]);
    expect(created.notes).toEqual([]);

    const snapshot = readroomSnapshot();
    expect(snapshot.addedReadrooms).toContain(created);
    const visible = withSession([...snapshot.addedReadrooms, readroom()], snapshot);
    expect(visible.map((entry) => entry.id)).toEqual([created.id, "task"]);
  });

  it("keeps optional facts out of the task when the draft has none", () => {
    const created = createReadroom(
      {
        title: "Snippet",
        tags: [],
        description: "Read it.",
        attachments: [],
        deadlineAt: DEADLINE,
      },
      { user: "ada" },
    );
    expect(created.sourceUrl).toBeUndefined();
    expect(created.ticket).toBeUndefined();
  });

  it("seeds a composed task with its attached files", () => {
    const created = createReadroom(
      { ...draft, attachments: [file("f1"), file("f2", "table.txt")] },
      { user: "ada" },
    );
    expect(readroomStateOf(readroomSnapshot(), created.id).attachments).toHaveLength(2);
  });
});
