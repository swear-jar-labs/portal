import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { LogonForm } from "../components/Account/LogonForm";
import { getMockSession } from "../components/Account/mock-session.server";
import { ShellPanel } from "../components/ShellPanel/ShellPanel";

export const metadata: Metadata = messages.account.login.metadata;

export default async function LoginPage() {
  const session = await getMockSession();
  if (session) redirect("/profile");

  return (
    <ShellPanel title={fileTitle("LOGON")}>
      <LogonForm />
    </ShellPanel>
  );
}
