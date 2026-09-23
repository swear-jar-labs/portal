import type { Actor } from "./actor";
import { applySchema, type ApplyInput } from "./schema";

type ApplicationStatus = "pending" | "needs-info" | "approved" | "rejected";
type ApplicationEventKind =
  "submitted" | "clarification-requested" | "clarification-sent" | "approved" | "rejected";

type ApplicationEvent = {
  kind: ApplicationEventKind;
  by: string;
  at: string;
  note: string | null;
};

export type MemberApplication = {
  id: string;
  user: string;
  status: ApplicationStatus;
  version: number;
  details: ApplyInput;
  history: ApplicationEvent[];
};

export type ApplicationError = "forbidden" | "invalid" | "conflict" | "missing";
type ApplicationResult =
  { ok: true; application: MemberApplication } | { ok: false; error: ApplicationError };

type Decision = "clarification-requested" | "approved" | "rejected";

// One process-local store for the UI demo. Operations are synchronous so a
// version check and transition happen together before another action can run.
export function createApplicationStore(promote: (user: string) => Actor | null) {
  const byUser = new Map<string, MemberApplication[]>();
  const byId = new Map<string, MemberApplication>();
  let nextId = 1;

  function snapshot(application: MemberApplication): MemberApplication {
    return {
      ...application,
      details: { ...application.details },
      history: application.history.map((event) => ({ ...event })),
    };
  }

  function event(kind: ApplicationEventKind, by: string, note: string | null, at: string) {
    return { kind, by, note, at };
  }

  return {
    forUser(user: string): MemberApplication[] {
      return (byUser.get(user) ?? []).map(snapshot);
    },
    all(): MemberApplication[] {
      return [...byId.values()].map(snapshot).reverse();
    },
    submit(actor: Actor | null, input: unknown, at = new Date().toISOString()): ApplicationResult {
      if (!actor || actor.level !== "participant") return { ok: false, error: "forbidden" };
      const parsed = applySchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: "invalid" };
      const applications = byUser.get(actor.user) ?? [];
      const latest = applications.at(-1);
      if (latest && latest.status !== "rejected") return { ok: false, error: "conflict" };
      const application: MemberApplication = {
        id: `member-${nextId++}`,
        user: actor.user,
        status: "pending",
        version: 1,
        details: parsed.data,
        history: [event("submitted", actor.user, null, at)],
      };
      applications.push(application);
      byUser.set(actor.user, applications);
      byId.set(application.id, application);
      return { ok: true, application: snapshot(application) };
    },
    respond(
      actor: Actor | null,
      id: string,
      version: number,
      note: string,
      at = new Date().toISOString(),
    ): ApplicationResult {
      if (!actor) return { ok: false, error: "forbidden" };
      const application = byId.get(id);
      if (!application) return { ok: false, error: "missing" };
      if (application.user !== actor.user || actor.level !== "participant") {
        return { ok: false, error: "forbidden" };
      }
      if (application.version !== version || application.status !== "needs-info") {
        return { ok: false, error: "conflict" };
      }
      const trimmed = note.trim();
      if (!trimmed || trimmed.length > MAX_NOTE_LENGTH) return { ok: false, error: "invalid" };
      application.status = "pending";
      application.version += 1;
      application.history.push(event("clarification-sent", actor.user, trimmed, at));
      return { ok: true, application: snapshot(application) };
    },
    decide(
      actor: Actor | null,
      id: string,
      version: number,
      decision: Decision,
      note: string,
      at = new Date().toISOString(),
    ): ApplicationResult {
      if (!actor?.admin) return { ok: false, error: "forbidden" };
      const application = byId.get(id);
      if (!application) return { ok: false, error: "missing" };
      if (application.version !== version || application.status !== "pending") {
        return { ok: false, error: "conflict" };
      }
      const trimmed = note.trim();
      if (trimmed.length > MAX_NOTE_LENGTH || (decision !== "approved" && !trimmed)) {
        return { ok: false, error: "invalid" };
      }
      if (decision === "approved" && !promote(application.user)) {
        return { ok: false, error: "missing" };
      }
      application.status = decision === "clarification-requested" ? "needs-info" : decision;
      application.version += 1;
      application.history.push(event(decision, actor.user, trimmed || null, at));
      return { ok: true, application: snapshot(application) };
    },
  };
}

export const MAX_NOTE_LENGTH = 2000;
