import type { Metadata } from "next";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { AccountGate } from "../components/Account/AccountGate";
import { getMockSession } from "../components/Account/mock-session.server";
import { SettingsForm } from "../components/Account/SettingsForm";
import { ShellPanel } from "../components/ShellPanel/ShellPanel";

export const metadata: Metadata = messages.account.settings.metadata;

export default async function SettingsPage() {
  const session = await getMockSession();
  if (!session) return <AccountGate title={fileTitle("SETTINGS")} />;

  return (
    <ShellPanel title={fileTitle("SETTINGS")}>
      <SettingsForm />
    </ShellPanel>
  );
}
