import { createApplicationStore } from "./applications";
import { promoteAccount, resolveAccount } from "./mock-accounts";
import { mockSessionEnabled } from "./mock-session";
import type { Actor } from "./actor";

// Shared with the account and admin slices through the account contract.
// LOGOFF preserves it; a server restart clears it along with demo accounts.
// Like the project queue, the store is lazy: importing the module performs
// no work and seeds nothing; the first server read or action builds it once.
type MemberApplicationStore = ReturnType<typeof createApplicationStore>;
const DEMO_AT = "2026-09-20T10:00:00.000Z";

let store: MemberApplicationStore | null = null;

function seedStore(target: MemberApplicationStore): void {
  target.submit(
    resolveAccount("demo-candidate"),
    {
      experience: "I built a small parser and its tests.",
      weeklyHours: "5-10",
      motivation: "I want to help maintain the tooling examples and learn through review.",
    },
    DEMO_AT,
  );
  const second = target.submit(
    resolveAccount("demo-second"),
    {
      experience: "Shell scripts and CI pipelines.",
      weeklyHours: "under-5",
      motivation: "I can document and test the build workflow with the team.",
    },
    DEMO_AT,
  );
  if (second.ok) {
    target.decide(
      resolveAccount("admin"),
      second.application.id,
      second.application.version,
      "clarification-requested",
      "Which CI systems have you used?",
      DEMO_AT,
    );
  }
}

function getStore(): MemberApplicationStore {
  if (!store) {
    store = createApplicationStore(promoteAccount);
    if (mockSessionEnabled()) seedStore(store);
  }
  return store;
}

export function memberApplicationsFor(user: string) {
  return getStore().forUser(user);
}

export function listMemberApplications(actor: Actor | null) {
  return actor?.admin ? getStore().all() : [];
}

export const submitMemberApplication: MemberApplicationStore["submit"] = (...args) =>
  getStore().submit(...args);
export const respondToMemberApplication: MemberApplicationStore["respond"] = (...args) =>
  getStore().respond(...args);
export const decideMemberApplication: MemberApplicationStore["decide"] = (...args) =>
  getStore().decide(...args);
