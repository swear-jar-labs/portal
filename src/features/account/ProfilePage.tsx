import type { Metadata } from "next";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { listThreadSummariesByAuthor } from "@/features/board/contracts";
import { AccountGate } from "./AccountGate";
import { getOwnProfile } from "./data";
import { memberApplicationsFor } from "./mock-applications";
import { getActorSession } from "./mock-session.server";
import { ProfileStack } from "./ProfileStack";

export const profileMetadata: Metadata = messages.account.profile.metadata;

export async function ProfilePage() {
  const actor = await getActorSession();
  if (!actor) return <AccountGate title={fileTitle("PROFILE")} />;

  const profile = await getOwnProfile(actor.user, actor);
  const threads = await listThreadSummariesByAuthor(actor.user);
  const now = new Date().toISOString();

  return (
    <ProfileStack
      profile={profile}
      threads={threads}
      now={now}
      applications={memberApplicationsFor(actor.user)}
      title={fileTitle("PROFILE")}
    />
  );
}
