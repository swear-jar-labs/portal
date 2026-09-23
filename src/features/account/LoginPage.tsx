import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fileTitle, FORUM_PATH, parseLoginReturn } from "@/content/commands";
import { messages } from "@/content/messages";
import { ShellPanel } from "@/features/shell";
import { LogonForm } from "./LogonForm";
import { getMockSession } from "./mock-session.server";

export const loginMetadata: Metadata = messages.account.login.metadata;

type LoginPageProps = {
  searchParams?: Promise<{ next?: string | string[] }>;
};

export async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const raw = params?.next;
  // A logon started on a page lands back there (?next=); a direct visit (or a
  // signed-in member opening /login) falls back to the member home, FORUM.
  const returnTo = parseLoginReturn(Array.isArray(raw) ? raw[0] : raw);
  const session = await getMockSession();
  if (session) redirect(returnTo ?? FORUM_PATH);

  return (
    <ShellPanel title={fileTitle("LOGON")} closable>
      <LogonForm returnTo={returnTo} />
    </ShellPanel>
  );
}
