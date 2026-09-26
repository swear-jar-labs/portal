"use server";

import { getActorSession, mockSessionEnabled, resolveAccount } from "@/features/account/contracts";
import { getProject } from "@/features/projects/contracts";
import type { TicketActor, TicketProject } from "../model/workflow";

export type FreshTicketAccess = { actor: TicketActor; project: TicketProject };

/** Recheck process-local account and project roles immediately before a mock
 * mutation. A tab opened before revocation cannot keep its former seat. */
export async function freshTicketAccess(slug: string): Promise<FreshTicketAccess | null> {
  if (!mockSessionEnabled()) return null;
  const [actor, project] = await Promise.all([getActorSession(), getProject(slug)]);
  if (!project) return null;
  return {
    actor: actor && { user: actor.user, level: actor.level, admin: actor.admin },
    project: {
      slug: project.slug,
      status: project.status,
      lead: project.lead,
      maintainers: project.maintainers,
      reviewers: project.reviewers ?? [],
      claimPolicy: project.claimPolicy,
    },
  };
}

export async function isCurrentMember(user: string): Promise<boolean> {
  return mockSessionEnabled() && resolveAccount(user)?.level === "member";
}
