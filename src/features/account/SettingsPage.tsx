import type { Metadata } from "next";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { SettingsForm, ShellPanel } from "@/features/shell";
import { AccountGate } from "./AccountGate";
import { getMockSession } from "./mock-session.server";

export const settingsMetadata: Metadata = messages.account.settings.metadata;

export async function SettingsPage() {
  const session = await getMockSession();
  if (!session) return <AccountGate title={fileTitle("SETTINGS")} />;

  return (
    <ShellPanel title={fileTitle("SETTINGS")} surface="light" closable>
      <SettingsForm />
    </ShellPanel>
  );
}
