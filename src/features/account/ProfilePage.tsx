import type { Metadata } from "next";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { ShellPanel } from "@/features/shell";
import { AccountGate } from "./AccountGate";
import { getOwnProfile } from "./data";
import { getMockSession } from "./mock-session.server";
import { ProfileView } from "./ProfileView";

export const profileMetadata: Metadata = messages.account.profile.metadata;

export async function ProfilePage() {
  const session = await getMockSession();
  if (!session) return <AccountGate title={fileTitle("PROFILE")} />;

  const profile = await getOwnProfile(session.user);

  return (
    <ShellPanel title={fileTitle("PROFILE")} closable>
      <ProfileView profile={profile} />
    </ShellPanel>
  );
}
