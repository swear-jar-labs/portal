import { describe, expect, it } from "vitest";
import { messages } from "@/content/messages";
import {
  formatDeadlineDate,
  hasNoteBy,
  hasUpvoted,
  isLead,
  phaseOf,
  phaseTones,
  rankReadroomMode,
  readroomModes,
  readroomPath,
  readroomPhases,
  readroomTagIds,
  toggledUpvoters,
  upvoteCount,
  visibleNotes,
  type Readroom,
  type ReadroomNote,
} from "@/features/readroom/readrooms";
import { ticketPath } from "@/features/tickets/contracts";

const DEADLINE = "2026-09-16T12:00:00.000Z";

function note(id: string, user: string, createdAt: string, body = "body"): ReadroomNote {
  return { id, author: { user }, createdAt, body };
}

function readroom(overrides: Partial<Readroom> = {}): Readroom {
  return {
    id: "task",
    title: "Task",
    tags: [],
    upvotes: [],
    description: "Description",
    lead: { user: "ada" },
    createdAt: "2026-09-15T12:00:00.000Z",
    deadlineAt: DEADLINE,
    notes: [],
    ...overrides,
  };
}

describe("phaseOf", () => {
  it("collects while the clock is before the deadline", () => {
    expect(phaseOf(readroom(), "2026-09-16T11:59:59.000Z")).toBe("collecting");
  });

  it("hands the deadline boundary to reviewing", () => {
    expect(phaseOf(readroom(), DEADLINE)).toBe("reviewing");
    expect(phaseOf(readroom(), "2026-09-16T13:00:00.000Z")).toBe("reviewing");
  });

  it("publishes as soon as the report exists, even before the deadline", () => {
    expect(
      phaseOf(
        readroom({ report: "Report", reportAt: "2026-09-15T12:00:00.000Z" }),
        "2026-09-14T12:00:00.000Z",
      ),
    ).toBe("published");
  });

  it("archives over the report: a closed task is archived", () => {
    expect(
      phaseOf(
        readroom({
          report: "Report",
          reportAt: "2026-09-15T12:00:00.000Z",
          archivedAt: "2026-09-16T12:00:00.000Z",
        }),
        "2026-09-17T12:00:00.000Z",
      ),
    ).toBe("archived");
  });

  it("reads an archive without a report as a stopped task", () => {
    expect(phaseOf(readroom({ archivedAt: DEADLINE }), "2026-09-17T12:00:00.000Z")).toBe(
      "archived",
    );
  });
});

describe("visibleNotes", () => {
  const before = "2026-09-16T11:00:00.000Z";
  const after = "2026-09-16T12:30:00.000Z";
  const notes = [
    note("n1", "ada", "2026-09-14T10:00:00.000Z"),
    note("n2", "ken", "2026-09-15T10:00:00.000Z"),
    note("n3", "ada", "2026-09-15T11:00:00.000Z"),
  ];
  const task = readroom({ notes });

  it("seals everything from a guest before the deadline", () => {
    expect(visibleNotes(task, before, null)).toEqual({ notes: [], sealed: 3 });
  });

  it("shows a member their own notes and counts the rest", () => {
    const visible = visibleNotes(task, before, "ada");
    expect(visible.notes.map((entry) => entry.id)).toEqual(["n1", "n3"]);
    expect(visible.sealed).toBe(1);
  });

  it("seals everything from a member with no notes in the task", () => {
    expect(visibleNotes(task, before, "nobody")).toEqual({ notes: [], sealed: 3 });
  });

  it("opens every note at the deadline, guests included", () => {
    expect(visibleNotes(task, DEADLINE, null).notes).toHaveLength(3);
    expect(visibleNotes(task, after, "ada")).toEqual({ notes: [...notes], sealed: 0 });
  });
});

describe("upvotes", () => {
  it("counts one vote per account and reads the voter's own", () => {
    expect(upvoteCount([])).toBe(0);
    expect(upvoteCount(["ada", "grace"])).toBe(2);
    expect(hasUpvoted(["ada"], "ada")).toBe(true);
    expect(hasUpvoted(["ada"], "ken")).toBe(false);
    expect(hasUpvoted(["ada"], null)).toBe(false);
  });

  it("adds on the first press and drops on the second, without duplicates", () => {
    expect(toggledUpvoters([], "ada")).toEqual(["ada"]);
    expect(toggledUpvoters(["ada", "grace"], "ada")).toEqual(["grace"]);
    expect(toggledUpvoters(["ada", "ada"], "grace")).toEqual(["ada", "ada", "grace"]);
  });
});

describe("rankReadroomMode", () => {
  const now = "2026-09-16T12:00:00.000Z";
  const at = (iso: string) => iso;

  const collectingLate = readroom({
    id: "collecting-late",
    createdAt: at("2026-09-14T12:00:00.000Z"),
    deadlineAt: at("2026-09-20T12:00:00.000Z"),
  });
  const collectingSoon = readroom({
    id: "collecting-soon",
    createdAt: at("2026-09-15T12:00:00.000Z"),
    deadlineAt: at("2026-09-18T12:00:00.000Z"),
    upvotes: ["lin"],
  });
  const reviewing = readroom({
    id: "reviewing",
    createdAt: at("2026-09-09T12:00:00.000Z"),
    deadlineAt: at("2026-09-10T12:00:00.000Z"),
  });
  const publishedQuiet = readroom({
    id: "published-quiet",
    createdAt: at("2026-09-13T12:00:00.000Z"),
    report: "Report",
    reportAt: at("2026-09-12T12:00:00.000Z"),
  });
  const publishedLoved = readroom({
    id: "published-loved",
    createdAt: at("2026-09-11T12:00:00.000Z"),
    report: "Report",
    reportAt: at("2026-09-15T12:00:00.000Z"),
    upvotes: ["ada", "grace"],
  });
  const publishedTieNew = readroom({
    id: "published-tie-new",
    createdAt: at("2026-09-14T12:00:00.000Z"),
    report: "Report",
    reportAt: at("2026-09-14T12:00:00.000Z"),
    upvotes: ["ken"],
  });
  const publishedTieOld = readroom({
    id: "published-tie-old",
    createdAt: at("2026-09-10T12:00:00.000Z"),
    report: "Report",
    reportAt: at("2026-09-14T12:00:00.000Z"),
    upvotes: ["ken"],
  });
  const archived = readroom({
    id: "archived",
    createdAt: at("2026-07-20T12:00:00.000Z"),
    report: "Report",
    reportAt: at("2026-08-01T12:00:00.000Z"),
    archivedAt: at("2026-08-05T12:00:00.000Z"),
    upvotes: ["ada", "grace", "ken", "lin"],
  });
  const all = [
    archived,
    publishedQuiet,
    collectingLate,
    reviewing,
    publishedLoved,
    publishedTieOld,
    publishedTieNew,
    collectingSoon,
  ];

  it("collects the open note collections by the closest deadline", () => {
    expect(rankReadroomMode(all, "active", now).map((entry) => entry.id)).toEqual([
      "collecting-soon",
      "collecting-late",
    ]);
  });

  it("ranks every cycle by upvotes, newest breaking ties", () => {
    expect(rankReadroomMode(all, "top", now).map((entry) => entry.id)).toEqual([
      "archived",
      "published-loved",
      "collecting-soon",
      "published-tie-new",
      "published-tie-old",
      "collecting-late",
      "published-quiet",
      "reviewing",
    ]);
  });

  it("ranks every cycle by freshness", () => {
    expect(rankReadroomMode(all, "new", now).map((entry) => entry.id)).toEqual([
      "collecting-soon",
      "collecting-late",
      "published-tie-new",
      "published-quiet",
      "published-loved",
      "published-tie-old",
      "reviewing",
      "archived",
    ]);
  });

  it("keeps stopped cycles out of Active only", () => {
    expect(rankReadroomMode(all, "active", now).map((entry) => entry.id)).not.toContain("archived");
    for (const mode of ["top", "new"] as const) {
      expect(rankReadroomMode(all, mode, now).map((entry) => entry.id)).toContain("archived");
    }
    expect(readroomModes).toEqual(["top", "new", "active"]);
  });
});

describe("stamps", () => {
  it("formats the exact date in UTC", () => {
    expect(formatDeadlineDate("2026-09-27T18:00:00.000Z")).toBe("2026-09-27 18:00 UTC");
    expect(formatDeadlineDate("2026-01-05T00:05:00.000Z")).toBe("2026-01-05 00:05 UTC");
    expect(formatDeadlineDate("not-a-date")).toBe("");
  });

  it("gives a tone to known phases only", () => {
    for (const [phase, tone] of Object.entries(phaseTones)) {
      expect(readroomPhases).toContain(phase);
      expect(tone).toBeTypeOf("string");
    }
  });

  it("owns the URL canon", () => {
    expect(readroomPath("retry-loop")).toBe("/readroom/retry-loop");
    expect(ticketPath("DOS-3")).toBe("/tickets/DOS-3");
  });

  it("gives every tag id a label and no stranger", () => {
    expect(Object.keys(messages.readroom.tags).sort()).toEqual([...readroomTagIds].sort());
  });

  it("gives every feed mode a label and no stranger", () => {
    expect(Object.keys(messages.readroom.feed.modes).sort()).toEqual([...readroomModes].sort());
  });

  it("reads the lead by authorship", () => {
    const task = readroom({ lead: { user: "ada" } });
    expect(isLead(task, "ada")).toBe(true);
    expect(isLead(task, "ken")).toBe(false);
    expect(isLead(task, null)).toBe(false);
  });

  it("sees one note per reader as the posting gate", () => {
    const notes = [
      note("n1", "ada", "2026-09-15T12:00:00.000Z"),
      note("n2", "ken", "2026-09-15T13:00:00.000Z"),
    ];
    expect(hasNoteBy(notes, "ada")).toBe(true);
    expect(hasNoteBy(notes, "grace")).toBe(false);
    expect(hasNoteBy(notes, null)).toBe(false);
  });
});
