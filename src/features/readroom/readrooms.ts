// The readroom's model: types, the phase projection and the pure helpers the
// slice shares. Fixtures and getters live in ./data; when the backend lands
// (Phase 5), the getters' bodies change to queries while the phases stay a
// projection of the same facts (TECH.md §5).

import type { Tone } from "@swearjar/dos";
import { techIds, type TechId } from "@/content/techs";

export const readroomPhases = ["collecting", "reviewing", "published", "archived"] as const;
export type ReadroomPhase = (typeof readroomPhases)[number];

// The phase reads as a chip; the archive is neutral.
export const phaseTones: Partial<Record<ReadroomPhase, Tone>> = {
  collecting: "green",
  reviewing: "yellow",
  published: "cyan",
};

// The cycle tags: the shared tech vocabulary (see src/content/techs.ts).
// Labels live in messages; the seed list is fixed until the taxonomy grows a
// consumer (a feed filter).
export const readroomTagIds = techIds;

export type ReadroomTagId = TechId;

export type ReadroomPerson = {
  user: string;
  avatar?: string;
};

export type ReadroomNote = {
  id: string;
  author: ReadroomPerson;
  body: string;
  createdAt: string;
};

// An attached file of a task. The UI-first mock points `url` at a blob that
// lives one SPA session; Phase 5 swaps it for a storage key (attachments-viewer)
// and the field set stays.
export type ReadroomAttachment = {
  id: string;
  name: string;
  size: number;
  url: string;
};

export type Readroom = {
  id: string;
  title: string;
  // The curiosity tags of the cycle: what the reading exercises. Empty is a
  // valid answer — the taxonomy lives beside the tags, not in the title.
  tags: readonly ReadroomTagId[];
  // The opening description: rendered as a white card under the source block.
  description: string;
  // The source is link-first: `sourceUrl` is a revision-pinned permalink and
  // the viewer is the forge. The link is all the source there is — what to read
  // and on which revision lives in the description (a snippet has no URL at
  // all and needs none).
  sourceUrl?: string;
  lead: ReadroomPerson;
  createdAt: string;
  deadlineAt: string;
  // The optional ticket context: the chip links to Tickets (the page arrives
  // with the Tickets slice, readroom-ticket-links).
  ticket?: string;
  report?: string;
  reportAt?: string;
  archivedAt?: string;
  notes: readonly ReadroomNote[];
};

// The white cards of the open task (the description, each note, the report
// body) stamp this attribute: the e2e whiteness check keys on it instead of
// the hashed CSS-module classes.
export const READROOM_CARD_ATTR = "data-readroom-card";

// The note anchor: the closed inline editor hands the keyboard back to it.
export const noteElementId = (id: string) => `readroom-note-${id}`;

// The readroom's URL canon.
export const READROOM_PATH = "/readroom";
export const readroomPath = (id: string) => `${READROOM_PATH}/${id}`;

// The ticket route canon lives with its first consumer until the Tickets slice
// takes it over.
export const ticketPath = (id: string) => `/tickets/${id}`;

/** The phase is a projection of facts, never a stored column: the archive wins
 * over the report, the report over the clock, and the deadline boundary
 * (`now === deadline`) belongs to reviewing. The Phase 5 queries repeat
 * these conditions — there is no second source of truth. */
export function phaseOf(
  readroom: Pick<Readroom, "deadlineAt" | "report" | "archivedAt">,
  nowIso: string,
): ReadroomPhase {
  if (readroom.archivedAt !== undefined) return "archived";
  if (readroom.report !== undefined) return "published";
  return Date.parse(nowIso) < Date.parse(readroom.deadlineAt) ? "collecting" : "reviewing";
}

/** The lead owns the cycle: the write-up, the deadline moves and the stop.
 * UI-first slices have no roles yet — the mock reads the lead by authorship;
 * Phase 5 keeps the check and adds the reviewer+ rule on top. */
export function isLead(readroom: Pick<Readroom, "lead">, user: string | null): boolean {
  return user !== null && readroom.lead.user === user;
}

/** READROOM.md §4: a participant posts one note per cycle — the note is edited
 * until the deadline, never duplicated. */
export function hasNoteBy(notes: readonly ReadroomNote[], user: string | null): boolean {
  if (user === null) return false;
  return notes.some((note) => note.author.user === user);
}

export type VisibleNotes = {
  notes: ReadroomNote[];
  sealed: number;
};

/** READROOM.md §5: a member before the deadline sees their own notes plus the
 * count of the others' (a guest — the count only); from the deadline on the
 * frozen notes are public, for guests and members alike. */
export function visibleNotes(
  readroom: Pick<Readroom, "deadlineAt" | "notes">,
  nowIso: string,
  viewer: string | null,
): VisibleNotes {
  const all = readroom.notes;
  if (Date.parse(nowIso) >= Date.parse(readroom.deadlineAt)) {
    return { notes: [...all], sealed: 0 };
  }
  if (viewer === null) return { notes: [], sealed: all.length };
  const own = all.filter((note) => note.author.user === viewer);
  return { notes: own, sealed: all.length - own.length };
}

const PHASE_ORDER: Record<ReadroomPhase, number> = {
  collecting: 0,
  reviewing: 1,
  published: 2,
  archived: 3,
};

function byId(a: Readroom, b: Readroom): number {
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

function byDeadline(a: Readroom, b: Readroom): number {
  return Date.parse(a.deadlineAt) - Date.parse(b.deadlineAt) || byId(a, b);
}

/** The list order: collecting by the closest deadline, reviewing by the
 * longest wait for a report, published by the freshest report, the archive
 * last (its own section) by the archive date. */
export function rankReadrooms(readrooms: readonly Readroom[], nowIso: string): Readroom[] {
  return [...readrooms].sort((a, b) => {
    const phase = phaseOf(a, nowIso);
    const other = phaseOf(b, nowIso);
    if (phase !== other) return PHASE_ORDER[phase] - PHASE_ORDER[other];
    switch (phase) {
      case "collecting":
      case "reviewing":
        return byDeadline(a, b);
      case "published":
        return (
          Date.parse(b.reportAt ?? b.deadlineAt) - Date.parse(a.reportAt ?? a.deadlineAt) ||
          byId(a, b)
        );
      case "archived":
        return (
          Date.parse(b.archivedAt ?? b.deadlineAt) - Date.parse(a.archivedAt ?? a.deadlineAt) ||
          byId(a, b)
        );
    }
  });
}

// One exact stamp format for every fact (deadline, report, archive): UTC keeps
// server and client renders identical.
const DATE_TIME_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** The exact date stamp: `2026-09-27 18:00 UTC`. */
export function formatDeadlineDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = DATE_TIME_PARTS.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")} UTC`;
}
