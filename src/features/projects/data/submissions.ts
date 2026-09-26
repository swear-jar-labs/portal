import { z } from "zod";
import type { Actor } from "@/features/account/contracts";
import { techIds } from "@/content/techs";
import { isKnownProjectSlug } from "./queries";
import { approvedProjects, registerApprovedProject } from "./project-registry";
import {
  DEFAULT_CLAIM_POLICY,
  dynamicTicketPrefix,
  fixtureTicketPrefixes,
  type Project,
} from "../model/projects";
export const MAX_PROJECT_STACK_TECHS = 10;

const SLUG_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const RESERVED_PROJECT_SLUGS = ["propose"] as const;
export const projectSubmissionSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(SLUG_PATTERN)
    .refine((slug) => !RESERVED_PROJECT_SLUGS.some((reserved) => reserved === slug)),
  name: z.string().trim().min(2).max(80),
  goal: z.string().trim().min(20).max(4000),
  repoUrl: z.union([z.literal(""), z.httpUrl().max(500)]),
  stack: z
    .array(z.enum(techIds))
    .min(1)
    .max(MAX_PROJECT_STACK_TECHS)
    .refine((chips) => new Set(chips).size === chips.length),
  contributors: z.string().trim().min(20).max(2000),
});
export type ProjectSubmissionInput = z.infer<typeof projectSubmissionSchema>;
export type ProjectSubmissionStatus = "pending" | "needs-info" | "approved" | "rejected";
export type ProjectSubmissionEvent = {
  kind: "submitted" | "clarification-requested" | "clarification-sent" | "approved" | "rejected";
  by: string;
  at: string;
  note: string | null;
};
export type ProjectSubmission = {
  id: string;
  user: string;
  status: ProjectSubmissionStatus;
  version: number;
  details: ProjectSubmissionInput;
  history: ProjectSubmissionEvent[];
};
export type SubmissionError = "forbidden" | "invalid" | "conflict" | "missing" | "slug-taken";
type SubmissionResult =
  { ok: true; submission: ProjectSubmission } | { ok: false; error: SubmissionError };
type Decision = "clarification-requested" | "approved" | "rejected";
export const MAX_PROJECT_NOTE_LENGTH = 2000;

export function createProjectSubmissionStore(
  isTaken: (slug: string) => boolean = isKnownProjectSlug,
  publish: (project: Project) => boolean = registerApprovedProject,
  existing: () => Project[] = approvedProjects,
) {
  const byUser = new Map<string, ProjectSubmission[]>();
  const byId = new Map<string, ProjectSubmission>();
  let nextId = 1;

  function snapshot(submission: ProjectSubmission): ProjectSubmission {
    return {
      ...submission,
      details: { ...submission.details, stack: [...submission.details.stack] },
      history: submission.history.map((event) => ({ ...event })),
    };
  }

  function event(
    kind: ProjectSubmissionEvent["kind"],
    by: string,
    at: string,
    note: string | null = null,
  ): ProjectSubmissionEvent {
    return { kind, by, at, note };
  }

  return {
    forUser(user: string): ProjectSubmission[] {
      return (byUser.get(user) ?? []).map(snapshot);
    },
    all(actor: Actor | null): ProjectSubmission[] {
      return actor?.admin ? [...byId.values()].map(snapshot).reverse() : [];
    },
    submit(actor: Actor | null, input: unknown, at = new Date().toISOString()): SubmissionResult {
      if (actor?.level !== "member") return { ok: false, error: "forbidden" };
      const parsed = projectSubmissionSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: "invalid" };
      if (isTaken(parsed.data.slug)) return { ok: false, error: "slug-taken" };
      const previous = (byUser.get(actor.user) ?? []).filter(
        (item) => item.details.slug === parsed.data.slug,
      );
      if (previous.at(-1)?.status !== undefined && previous.at(-1)?.status !== "rejected") {
        return { ok: false, error: "conflict" };
      }
      const submission: ProjectSubmission = {
        id: `project-${nextId++}`,
        user: actor.user,
        status: "pending",
        version: 1,
        details: parsed.data,
        history: [event("submitted", actor.user, at)],
      };
      byId.set(submission.id, submission);
      byUser.set(actor.user, [...(byUser.get(actor.user) ?? []), submission]);
      return { ok: true, submission: snapshot(submission) };
    },
    respond(
      actor: Actor | null,
      id: string,
      version: number,
      note: string,
      at = new Date().toISOString(),
    ): SubmissionResult {
      const submission = byId.get(id);
      if (!actor) return { ok: false, error: "forbidden" };
      if (!submission) return { ok: false, error: "missing" };
      if (submission.user !== actor.user || actor.level !== "member") {
        return { ok: false, error: "forbidden" };
      }
      if (submission.version !== version || submission.status !== "needs-info") {
        return { ok: false, error: "conflict" };
      }
      const trimmed = note.trim();
      if (!trimmed || trimmed.length > MAX_PROJECT_NOTE_LENGTH) {
        return { ok: false, error: "invalid" };
      }
      submission.status = "pending";
      submission.version += 1;
      submission.history.push(event("clarification-sent", actor.user, at, trimmed));
      return { ok: true, submission: snapshot(submission) };
    },
    decide(
      actor: Actor | null,
      id: string,
      version: number,
      decision: Decision,
      note: string,
      at = new Date().toISOString(),
    ): SubmissionResult {
      if (!actor?.admin) return { ok: false, error: "forbidden" };
      const submission = byId.get(id);
      if (!submission) return { ok: false, error: "missing" };
      if (submission.version !== version || submission.status !== "pending") {
        return { ok: false, error: "conflict" };
      }
      const trimmed = note.trim();
      if (trimmed.length > MAX_PROJECT_NOTE_LENGTH || (decision !== "approved" && !trimmed)) {
        return { ok: false, error: "invalid" };
      }
      if (decision === "approved") {
        const { details } = submission;
        if (isTaken(details.slug)) return { ok: false, error: "slug-taken" };
        const prefix = dynamicTicketPrefix(details.slug);
        const used = new Set([
          ...Object.values(fixtureTicketPrefixes),
          ...existing().map((project) => dynamicTicketPrefix(project.slug)),
        ]);
        if (used.has(prefix)) return { ok: false, error: "slug-taken" };
        // Lead and Maintainer are separate project relations with the same
        // initial person. No global account role is changed by approval.
        const person = { user: submission.user };
        const project: Project = {
          slug: details.slug,
          name: details.name,
          description: details.goal,
          techs: details.stack,
          contributors: details.contributors,
          createdAt: at,
          ...(details.repoUrl ? { repoUrl: details.repoUrl } : {}),
          status: "active",
          lead: person,
          maintainers: [person],
          claimPolicy: DEFAULT_CLAIM_POLICY,
        };
        if (!publish(project)) return { ok: false, error: "slug-taken" };
      }
      submission.status = decision === "clarification-requested" ? "needs-info" : decision;
      submission.version += 1;
      submission.history.push(event(decision, actor.user, at, trimmed || null));
      return { ok: true, submission: snapshot(submission) };
    },
  };
}
