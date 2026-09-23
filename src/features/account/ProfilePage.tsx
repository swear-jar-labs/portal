import type { Metadata } from "next";
import { Stack } from "@swearjar/dos";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { listThreadSummariesByAuthor } from "@/features/board/contracts";
import { ShellPanel } from "@/features/shell";
import { AccountGate } from "./AccountGate";
import { ApplicationHistory } from "./ApplicationHistory";
import { getOwnProfile } from "./data";
import { memberApplicationsFor } from "./mock-applications";
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
      <Stack gap={12}>
        <ProfileView profile={profile} threads={threads} now={now} />
        <ApplicationHistory applications={memberApplicationsFor(actor.user)} />
      </Stack>
    </ShellPanel>
  );
}
