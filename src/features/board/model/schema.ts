import { z } from "zod";
import { MAX_TAGS } from "@/lib/tags";
import { composableBoardIds, tagIds, threadTechIds } from "./threads";

// Board forms' input schemas: the same schemas guard the server actions in
// data/board-actions.ts; the forms do not change.

// A post's text: matches the reply composer and the edit draft.
const MAX_BODY_LENGTH = 4000;

const MAX_TITLE_LENGTH = 120;

export const replySchema = z.object({
  body: z.string().trim().min(1).max(MAX_BODY_LENGTH),
});

export type ReplyInput = z.infer<typeof replySchema>;

export function makeComposeSchema(allowedBoards: readonly string[] = composableBoardIds) {
  return z.object({
    // Archived journals are readable, not writable: the same set the composer
    // offers.
    board: z.string().refine((board) => allowedBoards.includes(board)),
    tags: z.array(z.enum(tagIds)).max(MAX_TAGS),
    techs: z.array(z.enum(threadTechIds)).max(MAX_TAGS),
    title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
    body: z.string().trim().min(1).max(MAX_BODY_LENGTH),
  });
}

export const composeSchema = makeComposeSchema();

export type ComposeInput = z.infer<typeof composeSchema>;
