import type { Metadata } from "next";
import { messages } from "@/content/messages";
import { listReadrooms } from "./data";
import { ReadroomStack } from "./ReadroomStack";

export const readroomMetadata: Metadata = messages.readroom.metadata;

export async function ReadroomPage() {
  const readrooms = await listReadrooms();
  const now = new Date().toISOString();

  // The feed reads no search params: the stack renders without a Suspense
  // boundary (unlike the board's filtered feed).
  return <ReadroomStack readrooms={readrooms} now={now} />;
}
