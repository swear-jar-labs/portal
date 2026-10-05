import type { Metadata } from "next";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { forumActivitySeed, listThreadSummariesByAuthor } from "@/features/board/contracts";
import { listMemberProjects } from "@/features/projects/contracts";
import { listReadrooms } from "@/features/readroom/contracts";
import { listTickets } from "@/features/tickets/contracts";
import { isSignedIn } from "../model/gates";
import { AccountGate } from "../auth/AccountGate";
import { getOwnProfile } from "../data/queries";
import { memberApplicationsFor } from "../data/mock-applications";
import { getActorSession } from "../data/auth-session.server";
import { ProfileStack } from "./ProfileStack";

export const profileMetadata: Metadata = messages.account.profile.metadata;

export async function ProfilePage() {
  const actor = await getActorSession();
  if (!isSignedIn(actor)) return <AccountGate title={fileTitle("PROFILE")} />;

  const profile = await getOwnProfile(actor.user, actor);
  const [threads, forumSeed, tickets, readrooms, projects] = await Promise.all([
    listThreadSummariesByAuthor(actor.user),
    forumActivitySeed(actor.user),
    listTickets(),
    listReadrooms(),
    listMemberProjects(actor.user),
  ]);
  const now = new Date().toISOString();

  return (
    <ProfileStack
      profile={profile}
      threads={threads}
      forumSeed={forumSeed}
      tickets={tickets}
      readrooms={readrooms}
      projects={projects}
      user={actor.user}
      now={now}
      applications={memberApplicationsFor(actor.user)}
      title={fileTitle("PROFILE")}
    />
  );
}
