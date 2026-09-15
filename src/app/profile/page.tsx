import type { Metadata } from "next";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { getOwnProfile } from "@/data/account";
import { AccountGate } from "../components/Account/AccountGate";
import { getMockSession } from "../components/Account/mock-session.server";
import { ProfileView } from "../components/Account/ProfileView";
import { ShellPanel } from "../components/ShellPanel/ShellPanel";

export const metadata: Metadata = messages.account.profile.metadata;

export default async function ProfilePage() {
  const session = await getMockSession();
  if (!session) return <AccountGate title={fileTitle("PROFILE")} />;

  const profile = await getOwnProfile(session.user);

  return (
    <ShellPanel title={fileTitle("PROFILE")}>
      <ProfileView profile={profile} />
    </ShellPanel>
  );
}
