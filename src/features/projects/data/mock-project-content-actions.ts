"use server";

import { revalidatePath } from "next/cache";
import { getActorSession, mockSessionEnabled } from "@/features/account/contracts";
import { projectContentSchema, type ProjectContentError } from "../model/project-content";
import { projectContent } from "./project-content-store";
import { getProject } from "./queries";

type Result = { ok: true } | { ok: false; error: ProjectContentError | "unavailable" };

export async function mockSaveProjectContent(input: unknown): Promise<Result> {
  if (!mockSessionEnabled()) return { ok: false, error: "unavailable" };
  const parsed = projectContentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const actor = await getActorSession();
  const project = await getProject(parsed.data.slug);
  if (!project) return { ok: false, error: "missing" };
  const result = projectContent.update(project, actor, parsed.data);
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  return { ok: true };
}
