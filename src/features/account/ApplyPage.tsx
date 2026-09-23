import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { ShellPanel } from "@/features/shell";
import { ApplyForm } from "./ApplyForm";
import { getActorSession } from "./mock-session.server";

export const applyMetadata: Metadata = messages.account.apply.metadata;

export async function ApplyPage() {
  const actor = await getActorSession();
  // Members already hold project access: their status lives on the profile.
  // Guests and Participants get the demo form (real queue in
  // ui-member-applications); nothing submitted here creates access.
  if (actor?.level === "member") redirect("/profile");

  return (
    <ShellPanel title={fileTitle("APPLY")} closable>
      <ApplyForm />
    </ShellPanel>
  );
}
