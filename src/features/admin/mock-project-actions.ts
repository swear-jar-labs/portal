"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActorSession, mockSessionEnabled } from "@/features/account/contracts";
import {
  decideProject,
  MAX_PROJECT_NOTE_LENGTH,
  type SubmissionError,
} from "@/features/projects/contracts";

type ActionResult = { ok: true } | { ok: false; error: SubmissionError | "unavailable" };
const decisionSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  decision: z.enum(["clarification-requested", "approved", "rejected"]),
  note: z.string().trim().max(MAX_PROJECT_NOTE_LENGTH),
});

export async function mockDecideProject(input: unknown): Promise<ActionResult> {
  if (!mockSessionEnabled()) return { ok: false, error: "unavailable" };
  const actor = await getActorSession();
  if (!actor?.admin) return { ok: false, error: "forbidden" };
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, version, decision, note } = parsed.data;
  const result = decideProject(actor, id, version, decision, note);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/", "layout");
  return { ok: true };
}
