import { describe, expect, it } from "vitest";
import { getReadroom, listReadrooms } from "@/features/readroom/data";
import { phaseOf } from "@/features/readroom/readrooms";
import { avatarFor } from "@/shared/members";

const KNOWN_USERS = ["ada", "grace", "ken", "lin"];

describe("readroom fixtures", () => {
  it("keeps ids unique and resolvable", async () => {
    const readrooms = await listReadrooms();
    const ids = readrooms.map((readroom) => readroom.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(await getReadroom(id), `${id} is not resolvable`).not.toBeNull();
    }
    expect(await getReadroom("no-such-task")).toBeNull();
  });

  it("holds all four phases at once", async () => {
    const now = new Date().toISOString();
    const phases = new Set((await listReadrooms()).map((readroom) => phaseOf(readroom, now)));
    expect([...phases].sort()).toEqual(["archived", "collecting", "published", "reviewing"]);
  });

  it("keeps the fact invariants: report and archive come with their stamps", async () => {
    for (const readroom of await listReadrooms()) {
      expect(
        Date.parse(readroom.createdAt),
        `${readroom.id} was created after its deadline`,
      ).toBeLessThan(Date.parse(readroom.deadlineAt));
      if (readroom.report !== undefined) {
        expect(readroom.reportAt, `${readroom.id} has a report without reportAt`).toBeDefined();
      }
      if (readroom.reportAt !== undefined) {
        expect(readroom.report, `${readroom.id} has reportAt without a report`).toBeDefined();
      }
      if (readroom.archivedAt !== undefined) {
        expect(readroom.report, `${readroom.id} is archived without a report`).toBeDefined();
        expect(
          Date.parse(readroom.archivedAt),
          `${readroom.id} is archived before the report`,
        ).toBeGreaterThanOrEqual(Date.parse(readroom.reportAt ?? readroom.deadlineAt));
      }
    }
  });

  it("keeps the tags of a task unique and known", async () => {
    for (const readroom of await listReadrooms()) {
      expect(new Set(readroom.tags).size, `${readroom.id} repeats a tag`).toBe(
        readroom.tags.length,
      );
    }
  });

  it("keeps the archived fixture with a report and exactly one ticket link", async () => {
    const readrooms = await listReadrooms();
    expect(readrooms.some((readroom) => readroom.archivedAt !== undefined && readroom.report)).toBe(
      true,
    );
    expect(readrooms.filter((readroom) => readroom.ticket !== undefined)).toHaveLength(1);
  });

  it("keeps every person on the member registry", async () => {
    for (const readroom of await listReadrooms()) {
      expect(KNOWN_USERS, `${readroom.id} has an unknown lead`).toContain(readroom.lead.user);
      expect(new Set(readroom.upvotes).size, `${readroom.id} repeats a voter`).toBe(
        readroom.upvotes.length,
      );
      for (const voter of readroom.upvotes) {
        expect(KNOWN_USERS, `${readroom.id} has an unknown voter`).toContain(voter);
      }
      expect(readroom.lead.avatar).toBe(avatarFor(readroom.lead.user));

      const noteIds = readroom.notes.map((note) => note.id);
      expect(new Set(noteIds).size, `${readroom.id} repeats a note id`).toBe(noteIds.length);
      const authors = readroom.notes.map((note) => note.author.user);
      expect(new Set(authors).size, `${readroom.id} repeats a note author`).toBe(authors.length);
      let previous = Number.NEGATIVE_INFINITY;
      for (const note of readroom.notes) {
        expect(KNOWN_USERS, `${note.id} has an unknown author`).toContain(note.author.user);
        expect(note.author.avatar).toBe(avatarFor(note.author.user));
        expect(note.body.trim(), `${note.id} is empty`).not.toBe("");
        const created = Date.parse(note.createdAt);
        expect(created, `${note.id} predates the previous note`).toBeGreaterThanOrEqual(previous);
        expect(created, `${note.id} was written after the deadline`).toBeLessThanOrEqual(
          Date.parse(readroom.deadlineAt),
        );
        previous = created;
      }
    }
  });
});
