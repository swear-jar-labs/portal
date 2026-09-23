import type { Actor } from "./actor";
import { createApplicationStore } from "./applications";
import { promoteAccount } from "./mock-accounts";

// Shared with the account and admin slices through the account contract.
// LOGOFF preserves it; a server restart clears it along with demo accounts.
const applications = createApplicationStore(promoteAccount);

export function memberApplicationsFor(user: string) {
  return applications.forUser(user);
}

export function listMemberApplications(actor: Actor | null) {
  return actor?.admin ? applications.all() : [];
}

export const submitMemberApplication = applications.submit;
export const respondToMemberApplication = applications.respond;
export const decideMemberApplication = applications.decide;
