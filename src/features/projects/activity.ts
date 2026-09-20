import { listRecentThreadSummariesByBoard } from "@/features/board/contracts";
import type { Project } from "./projects";

/** The index ranking base: the freshest journal activity per project slug,
 * read through the board's contract. The page (an RSC module) owns the
 * collection; the contract graph stays board-free. */
export async function collectActivity(
  slugs: readonly Project["slug"][],
  now: number,
): Promise<Record<string, string>> {
  const activity: Record<string, string> = {};
  for (const slug of slugs) {
    const [latest] = await listRecentThreadSummariesByBoard(slug, 1, now);
    if (latest !== undefined) activity[slug] = latest.lastActivityAt;
  }
  return activity;
}
