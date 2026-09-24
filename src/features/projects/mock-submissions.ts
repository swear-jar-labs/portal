import type { Actor } from "@/features/account/contracts";
import { createProjectSubmissionStore } from "./submissions";

const submissions = createProjectSubmissionStore();
const DEMO_AT = "2026-09-20T11:00:00.000Z";

const DEMO_GRACE: Actor = { user: "grace", level: "member", admin: false, email: null };
const DEMO_ADA: Actor = { user: "ada", level: "member", admin: false, email: null };
const DEMO_ADMIN: Actor = { user: "admin", level: "member", admin: true, email: null };

if (process.env.NODE_ENV !== "production") {
  submissions.submit(
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
  const second = submissions.submit(
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
    submissions.decide(
      DEMO_ADMIN,
      second.submission.id,
      second.submission.version,
      "clarification-requested",
      "How will you keep CI costs bounded?",
      DEMO_AT,
    );
  }
}

export function projectSubmissionsFor(user: string) {
  return submissions.forUser(user);
}

export function listProjectSubmissions(actor: Actor | null) {
  return submissions.all(actor);
}

export const submitProject = submissions.submit;
export const respondToProject = submissions.respond;
export const decideProject = submissions.decide;
