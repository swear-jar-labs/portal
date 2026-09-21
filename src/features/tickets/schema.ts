import { z } from "zod";
import { projectSlugs } from "@/features/projects/contracts";
import {
  ticketLinkKinds,
  ticketPriorities,
  ticketSizes,
  ticketStatuses,
  ticketTagIds,
} from "./tickets";

// UI-first slice: input schemas of the tickets' forms. When the backend lands
// (Phase 5) the same schemas guard the server actions; the forms do not change.

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 4000;
// Tags are optional; the cap keeps the dossier chip row readable.
const MAX_TAGS = 3;
const MAX_URL_LENGTH = 500;
const MAX_LABEL_LENGTH = 80;

export const ticketComposeSchema = z.object({
  // The project is locked on the project page and chosen on the tracker:
  // either way the value is a registry slug, never free text.
  project: z.enum(projectSlugs),
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
  body: z.string().trim().min(1).max(MAX_BODY_LENGTH),
  size: z.enum(ticketSizes),
  priority: z.enum(ticketPriorities),
  tags: z.array(z.enum(ticketTagIds)).max(MAX_TAGS),
});

export type TicketComposeInput = z.infer<typeof ticketComposeSchema>;

// The editor's form: the same fields minus the project (the ticket key is bound
// to its project, so a ticket never moves between projects) plus the status
// (the author or a project maintainer moves it from the edit layer).
export const ticketEditSchema = ticketComposeSchema
  .omit({ project: true })
  .extend({ status: z.enum(ticketStatuses) });

export type TicketEditInput = z.infer<typeof ticketEditSchema>;

export const ticketLinkSchema = z.object({
  kind: z.enum(ticketLinkKinds),
  url: z.httpUrl().max(MAX_URL_LENGTH),
  label: z.string().trim().min(1).max(MAX_LABEL_LENGTH),
});

export type TicketLinkInput = z.infer<typeof ticketLinkSchema>;

const MAX_COMMENT_LENGTH = 2000;
// The longest fixture key is CACHE-12345 (11); the cap leaves the pattern room.
const MAX_KEY_LENGTH = 16;

export const ticketCommentSchema = z.object({
  body: z.string().trim().min(1).max(MAX_COMMENT_LENGTH),
});

export const ticketBlockSchema = z.object({
  key: z.string().trim().min(1).max(MAX_KEY_LENGTH),
});
