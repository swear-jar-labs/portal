import type { Actor } from "@/features/account/contracts";
import { isMockMode } from "@/shared/mock";
import { createProjectSubmissionStore, type ProjectSubmission } from "./submissions";

// The proposal queue is a server-process mock (see mock-applications in the
// account slice). The store is lazy: importing the module (also through the
// projects contract in client graphs) performs no work and seeds nothing.
// The first server read or action builds it once and seeds the demo queue.
type ProjectSubmissionStore = ReturnType<typeof createProjectSubmissionStore>;

const DEMO_AT = "2026-09-20T11:00:00.000Z";
const DEMO_GRACE: Actor = {
  user: "grace",
  username: "grace",
  bio: "",
  avatar: undefined,
  level: "member",
  admin: false,
  email: null,
};
const DEMO_ADA: Actor = {
  user: "ada",
  username: "ada",
  bio: "",
  avatar: undefined,
  level: "member",
  admin: false,
  email: null,
};
const DEMO_ADMIN: Actor = {
  user: "admin",
  username: "admin",
  bio: "",
  avatar: undefined,
  level: "member",
  admin: true,
  email: null,
};

let store: ProjectSubmissionStore | null = null;

function seedStore(target: ProjectSubmissionStore): void {
  target.submit(
    DEMO_GRACE,
    {
      slug: "demo-parser-lab",
      name: "Parser Lab",
      goal: "A small shared project for writing and testing hand-built parsers.",
      repoUrl: "",
      stack: ["rust", "typescript"],
      contributors: "Members can help with examples, tests, and explanations of parser errors.",
    },
    DEMO_AT,
  );
  const second = target.submit(
    DEMO_ADA,
    {
      slug: "demo-ci-garden",
      name: "CI Garden",
      goal: "A shared set of reproducible CI experiments for small repositories.",
      repoUrl: "https://github.com/example/ci-garden",
      stack: ["shell", "ci"],
      contributors: "Looking for members to test workflows on Linux and macOS.",
    },
    DEMO_AT,
  );
  if (second.ok) {
    target.decide(
      DEMO_ADMIN,
      second.submission.id,
      second.submission.version,
      "clarification-requested",
      "How will you keep CI costs bounded?",
      DEMO_AT,
    );
  }
}

function getStore(): ProjectSubmissionStore {
  if (!store) {
    store = createProjectSubmissionStore();
    if (isMockMode()) seedStore(store);
  }
  return store;
}

export function projectSubmissionsFor(user: string): ProjectSubmission[] {
  return getStore().forUser(user);
}

export function listProjectSubmissions(actor: Actor | null): ProjectSubmission[] {
  return getStore().all(actor);
}

export const submitProject: ProjectSubmissionStore["submit"] = (...args) =>
  getStore().submit(...args);
export const respondToProject: ProjectSubmissionStore["respond"] = (...args) =>
  getStore().respond(...args);
export const decideProject: ProjectSubmissionStore["decide"] = (...args) =>
  getStore().decide(...args);
