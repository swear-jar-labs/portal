import type { Metadata } from "next";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { listThreadSummariesByAuthor } from "@/features/board/contracts";
import { ShellPanel } from "@/features/shell";
import { AccountGate } from "./AccountGate";
import { getOwnProfile } from "./data";
import { getActorSession } from "./mock-session.server";
import { ProfileView } from "./ProfileView";

export const profileMetadata: Metadata = messages.account.profile.metadata;

export async function ProfilePage() {
  const actor = await getActorSession();
  if (!actor) return <AccountGate title={fileTitle("PROFILE")} />;

  const profile = await getOwnProfile(actor.user, { level: actor.level, admin: actor.admin });
  const threads = await listThreadSummariesByAuthor(actor.user);
  const now = new Date().toISOString();

  return (
    <ShellPanel title={fileTitle("PROFILE")} closable>
      <ProfileView profile={profile} threads={threads} now={now} />
    </ShellPanel>
  );
}
