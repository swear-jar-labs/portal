import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { ShellPanel } from "@/features/shell";
import { ApplyForm } from "./ApplyForm";
import { memberApplicationsFor } from "./mock-applications";
import { getActorSession } from "./mock-session.server";

export const applyMetadata: Metadata = messages.account.apply.metadata;

export async function ApplyPage() {
  const actor = await getActorSession();
  if (!actor) redirect("/register");
  if (actor.level === "member") redirect("/profile");

  return (
    <ShellPanel title={fileTitle("APPLY")} closable>
      <ApplyForm applicant={actor.user} applications={memberApplicationsFor(actor.user)} />
    </ShellPanel>
  );
}
