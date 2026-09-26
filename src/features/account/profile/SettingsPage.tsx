import type { Metadata } from "next";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { SettingsForm, ShellPanel } from "@/features/shell";
import { AccountGate } from "../auth/AccountGate";
import { getActorSession } from "../data/mock-session.server";

export const settingsMetadata: Metadata = messages.account.settings.metadata;

export async function SettingsPage() {
  const actor = await getActorSession();
  if (!actor) return <AccountGate title={fileTitle("SETTINGS")} />;

  return (
    <ShellPanel title={fileTitle("SETTINGS")} closable>
      <SettingsForm />
    </ShellPanel>
  );
}
