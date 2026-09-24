"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActorSession, mockSessionEnabled } from "@/features/account/contracts";
import { respondToProject, submitProject } from "./mock-submissions";
import {
  MAX_PROJECT_NOTE_LENGTH,
  projectSubmissionSchema,
  type SubmissionError,
} from "./submissions";

type ActionResult = { ok: true } | { ok: false; error: SubmissionError | "unavailable" };
const responseSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  note: z.string().trim().min(1).max(MAX_PROJECT_NOTE_LENGTH),
});

function finish(result: { ok: boolean; error?: SubmissionError }): ActionResult {
  if (!result.ok) return { ok: false, error: result.error ?? "invalid" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function mockSubmitProject(input: unknown): Promise<ActionResult> {
  if (!mockSessionEnabled()) return { ok: false, error: "unavailable" };
  const actor = await getActorSession();
  if (actor?.level !== "member") return { ok: false, error: "forbidden" };
  const parsed = projectSubmissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return finish(submitProject(actor, parsed.data));
}

export async function mockRespondToProject(input: unknown): Promise<ActionResult> {
  if (!mockSessionEnabled()) return { ok: false, error: "unavailable" };
  const parsed = responseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const actor = await getActorSession();
  return finish(respondToProject(actor, parsed.data.id, parsed.data.version, parsed.data.note));
}
