import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { ShellPanel } from "@/features/shell";
import { ApplyForm } from "./ApplyForm";
import { getMockSession } from "./mock-session.server";

export const applyMetadata: Metadata = messages.account.apply.metadata;

export async function ApplyPage() {
  const session = await getMockSession();
  if (session) redirect("/profile");

  return (
    <ShellPanel title={fileTitle("APPLY")}>
      <ApplyForm />
    </ShellPanel>
  );
}
