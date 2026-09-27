import type { Metadata } from "next";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { AccountGate, getActorSession } from "@/features/account/contracts";
import { ReportsStack } from "./ReportsStack";

export const reportsMetadata: Metadata = messages.moderation.metadata;

export async function ReportsPage() {
  const actor = await getActorSession();
  if (!actor) return <AccountGate title={fileTitle("REPORTS")} />;
  return <ReportsStack user={actor.user} />;
}
