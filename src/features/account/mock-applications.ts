import type { Actor } from "./actor";
import { createApplicationStore } from "./applications";
import { promoteAccount, resolveAccount } from "./mock-accounts";
import { mockSessionEnabled } from "./mock-session";

// Shared with the account and admin slices through the account contract.
// LOGOFF preserves it; a server restart clears it along with demo accounts.
const applications = createApplicationStore(promoteAccount);
const DEMO_AT = "2026-09-20T10:00:00.000Z";

if (mockSessionEnabled()) {
  applications.submit(
    resolveAccount("demo-candidate"),
    {
      experience: "I built a small parser and its tests.",
      weeklyHours: "5-10",
      motivation: "I want to help maintain the tooling examples and learn through review.",
    },
    DEMO_AT,
  );
  const second = applications.submit(
    resolveAccount("demo-second"),
    {
      experience: "Shell scripts and CI pipelines.",
      weeklyHours: "under-5",
      motivation: "I can document and test the build workflow with the team.",
    },
    DEMO_AT,
  );
  if (second.ok) {
    applications.decide(
      resolveAccount("admin"),
      second.application.id,
      second.application.version,
      "clarification-requested",
      "Which CI systems have you used?",
      DEMO_AT,
    );
  }
}

export function memberApplicationsFor(user: string) {
  return applications.forUser(user);
}

export function listMemberApplications(actor: Actor | null) {
  return actor?.admin ? applications.all() : [];
}

export const submitMemberApplication = applications.submit;
export const respondToMemberApplication = applications.respond;
export const decideMemberApplication = applications.decide;
