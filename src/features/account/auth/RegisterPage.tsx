import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { ShellPanel } from "@/features/shell";
import { getActorSession } from "../data/auth-session.server";
import { socialAuth } from "../data/social-auth.server";
import { RegisterForm } from "./RegisterForm";

export const registerMetadata: Metadata = messages.account.register.metadata;

export async function RegisterPage() {
  const actor = await getActorSession();
  if (actor) redirect("/profile");
  // One mapping point for the provider row.
  const { providers } = socialAuth();

  return (
    <ShellPanel title={fileTitle("REGISTER")}>
      <RegisterForm providers={providers} />
    </ShellPanel>
  );
}
