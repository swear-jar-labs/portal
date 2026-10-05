import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { ShellPanel } from "@/features/shell";
import { ApplyForm } from "./ApplyForm";
import { isSignedIn, meetsLevel } from "../model/gates";
import { memberApplicationsFor } from "../data/mock-applications";
import { getActorSession } from "../data/auth-session.server";

export const applyMetadata: Metadata = messages.account.apply.metadata;

export async function ApplyPage() {
  const actor = await getActorSession();
  if (!isSignedIn(actor)) redirect("/register");
  if (meetsLevel(actor, "member")) redirect("/profile");

  return (
    <ShellPanel title={fileTitle("APPLY")}>
      <ApplyForm applicant={actor.user} applications={memberApplicationsFor(actor.user)} />
    </ShellPanel>
  );
}
