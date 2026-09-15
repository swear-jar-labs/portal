import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { ApplyForm } from "../components/Account/ApplyForm";
import { getMockSession } from "../components/Account/mock-session.server";
import { ShellPanel } from "../components/ShellPanel/ShellPanel";

export const metadata: Metadata = messages.account.apply.metadata;

export default async function ApplyPage() {
  const session = await getMockSession();
  if (session) redirect("/profile");

  return (
    <ShellPanel title={fileTitle("APPLY")}>
      <ApplyForm />
    </ShellPanel>
  );
}
