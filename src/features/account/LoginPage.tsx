import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { ShellPanel } from "@/features/shell";
import { LogonForm } from "./LogonForm";
import { getMockSession } from "./mock-session.server";

export const loginMetadata: Metadata = messages.account.login.metadata;

export async function LoginPage() {
  const session = await getMockSession();
  if (session) redirect("/profile");

  return (
    <ShellPanel title={fileTitle("LOGON")} surface="light" closable>
      <LogonForm />
    </ShellPanel>
  );
}
