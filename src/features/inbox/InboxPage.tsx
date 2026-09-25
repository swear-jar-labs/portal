import type { Metadata } from "next";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { AccountGate, getActorSession } from "@/features/account/contracts";
import { listInboxSeed } from "./data";
import { InboxStack } from "./InboxStack";

export const inboxMetadata: Metadata = messages.inbox.metadata;

export async function InboxPage() {
  const actor = await getActorSession();
  if (!actor) return <AccountGate title={fileTitle("INBOX")} />;

  const seed = await listInboxSeed(actor.user);
  return <InboxStack user={actor.user} seed={seed} now={new Date().toISOString()} />;
}
