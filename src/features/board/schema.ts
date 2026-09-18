import { z } from "zod";
import { boardIds, tagIds } from "./threads";

// UI-first slice: input schemas of the board's forms. When the backend lands
// (Phase 5) the same schemas guard the server actions; the forms do not change.

// A post's text: matches the reply composer and the edit draft.
const MAX_BODY_LENGTH = 4000;

const MAX_TITLE_LENGTH = 120;
// Tags are optional; the cap keeps the card's chip row readable.
const MAX_TAGS = 3;

export const replySchema = z.object({
  body: z.string().trim().min(1).max(MAX_BODY_LENGTH),
});

export type ReplyInput = z.infer<typeof replySchema>;

export const composeSchema = z.object({
  board: z.enum(boardIds),
  tags: z.array(z.enum(tagIds)).max(MAX_TAGS),
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
  body: z.string().trim().min(1).max(MAX_BODY_LENGTH),
});

export type ComposeInput = z.infer<typeof composeSchema>;
