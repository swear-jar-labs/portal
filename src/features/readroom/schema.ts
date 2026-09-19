import { z } from "zod";
import { readroomTagIds } from "./readrooms";

// UI-first slice: input schemas of the readroom's forms. When the backend lands
// (Phase 5) the same schemas guard the server actions; the forms do not change.

// A note or a write-up: the same text limits as a board post.
const MAX_BODY_LENGTH = 4000;
const MAX_TITLE_LENGTH = 120;
// Tags are optional; the cap keeps the source row readable.
const MAX_TAGS = 3;
const MAX_TICKET_LENGTH = 32;
const MAX_URL_LENGTH = 500;

export const noteSchema = z.object({
  body: z.string().trim().min(1).max(MAX_BODY_LENGTH),
});

export type NoteInput = z.infer<typeof noteSchema>;

export const reportSchema = z.object({
  body: z.string().trim().min(1).max(MAX_BODY_LENGTH),
});

export type ReportInput = z.infer<typeof reportSchema>;

// The creation form: the optional link-first source (a revision-pinned
// permalink; a snippet has no URL and says so in the description), tags, the
// opening description and the deadline. The deadline stays the form's local
// `datetime-local` value here, and the schema only checks it is present: the
// "must be in the future" rule needs the clock and lives in the forms
// (./datetime converts the value to an instant).
export const readroomSchema = z.object({
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
  tags: z
    .array(z.enum(readroomTagIds))
    .max(MAX_TAGS)
    // The UI toggles cannot duplicate a tag; the schema keeps the future
    // server actions honest.
    .refine((tags) => new Set(tags).size === tags.length),
  description: z.string().trim().min(1).max(MAX_BODY_LENGTH),
  sourceUrl: z.httpUrl().max(MAX_URL_LENGTH).optional(),
  ticket: z.string().trim().max(MAX_TICKET_LENGTH).optional(),
  deadline: z.string().trim().min(1),
});

export type ReadroomInput = z.infer<typeof readroomSchema>;
