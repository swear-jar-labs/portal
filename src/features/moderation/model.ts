export const moderationKinds = ["post", "note", "comment"] as const;
export type ModerationKind = (typeof moderationKinds)[number];

export type ModerationTarget = {
  kind: ModerationKind;
  id: string;
  author: string;
  label: string;
  href: string;
  rootThreadId?: string;
  localBody?: string;
  initialBody?: string;
};

export type ReportStatus =
  "received" | "reviewing" | "needs-edit" | "correction-submitted" | "resolved";
export type ResolutionOutcome = "corrected" | "no-violation" | "remain-hidden" | "deleted";
export type ModerationAction = "review" | "request-edit" | "resolve" | "hide" | "restore";
export type ModerationAudience = "moderators" | "author" | "reporters";
export type ModerationEventKind =
  | "case-opened"
  | "reported"
  | "review-started"
  | "edit-requested"
  | "correction-submitted"
  | "author-response"
  | "review-requested"
  | "hidden"
  | "restored"
  | "resolved";

export type ModerationEvent = {
  id: string;
  kind: ModerationEventKind;
  actor: string;
  body: string;
  at: string;
  round: number;
  audience: readonly ModerationAudience[];
  revision?: number;
  reporter?: string;
};

export type Complaint = {
  id: string;
  reporter: string;
  reason: string;
  createdAt: string;
  round: number;
  outcome?: ResolutionOutcome;
};

/** One case per material. A new complaint after resolution starts another round. */
export type ModerationReport = {
  id: string;
  sourceCaseId?: string;
  target: ModerationTarget;
  reporter: string;
  reason: string;
  complaints: readonly Complaint[];
  events: readonly ModerationEvent[];
  status: ReportStatus;
  correctionReady: boolean;
  correctionSubmittedAt?: string;
  currentBody?: string;
  currentRevision: number;
  submittedRevision?: number;
  submittedBody?: string;
  reviewPending: boolean;
  appealUsedRound?: number;
  resolution?: ResolutionOutcome;
  round: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type HiddenTarget = { note: string; at: string; caseId: string; permanent: boolean };

export type ModerationState = {
  reports: readonly ModerationReport[];
  hidden: Readonly<Record<string, HiddenTarget>>;
  unavailable: ReadonlySet<string>;
  seenByAuthor: Readonly<Record<string, number>>;
  seenByReporter: Readonly<Record<string, number>>;
};

export const INITIAL_MODERATION_STATE: ModerationState = {
  reports: [],
  hidden: {},
  unavailable: new Set(),
  seenByAuthor: {},
  seenByReporter: {},
};

export function targetKey(target: Pick<ModerationTarget, "kind" | "id">): string {
  return `${target.kind}:${target.id}`;
}

export function caseForTarget(
  state: ModerationState,
  target: Pick<ModerationTarget, "kind" | "id">,
): ModerationReport | undefined {
  return state.reports.find((report) => targetKey(report.target) === targetKey(target));
}

export function isThreadHidden(state: ModerationState, threadId: string): boolean {
  return state.reports.some(
    (report) =>
      report.target.rootThreadId === threadId &&
      state.hidden[targetKey(report.target)] !== undefined,
  );
}

/** A second appeal adds information to a closed case; an admin may reopen it. */
export function canReopenReview(report: ModerationReport, hidden: boolean): boolean {
  if (!hidden || report.status !== "resolved" || report.appealUsedRound !== report.round)
    return false;
  const lastResolution = report.events.findLastIndex(
    (entry) => entry.kind === "resolved" && entry.round === report.round,
  );
  return report.events
    .slice(lastResolution + 1)
    .some((entry) => entry.kind === "review-requested" && entry.round === report.round);
}

export function visibleEvents(
  report: ModerationReport,
  user: string,
  role: "author" | "reporter" | "admin",
): ModerationEvent[] {
  if (role === "admin") return [...report.events];
  return report.events.filter(
    (event) =>
      event.audience.includes(role === "author" ? "author" : "reporters") &&
      (role === "author" || event.reporter === undefined || event.reporter === user),
  );
}

export function sentReportsFor(state: ModerationState, user: string): ModerationReport[] {
  return state.reports.flatMap((report) => {
    const mine = report.complaints.filter((complaint) => complaint.reporter === user);
    return mine.map((complaint) => {
      const events = visibleEvents(report, user, "reporter").filter(
        (entry) =>
          entry.round === complaint.round && (entry.kind !== "reported" || entry.reporter === user),
      );
      return {
        ...report,
        id: complaint.id,
        sourceCaseId: report.id,
        reporter: user,
        reason: complaint.reason,
        complaints: [complaint],
        events,
        status: complaint.round === report.round ? report.status : "resolved",
        resolution: complaint.outcome,
        updatedAt: events.at(-1)?.at ?? complaint.createdAt,
        currentBody: undefined,
        submittedBody: undefined,
      };
    });
  });
}

export function contentReportsFor(state: ModerationState, user: string): ModerationReport[] {
  return state.reports
    .filter((report) => report.target.author === user)
    .map((report) => {
      const events = visibleEvents(report, user, "author");
      return {
        ...report,
        reporter: "",
        reason: "",
        complaints: [],
        events,
      };
    });
}

export function canSeeReport(
  report: ModerationReport,
  actor: string | null,
  admin: boolean,
): boolean {
  return (
    admin ||
    actor === report.target.author ||
    report.complaints.some((entry) => entry.reporter === actor)
  );
}

export function publicReport(report: ModerationReport, actor: string | null, admin: boolean) {
  if (!canSeeReport(report, actor, admin)) return null;
  if (admin) return report;
  if (actor === report.target.author)
    return contentReportsFor({ ...INITIAL_MODERATION_STATE, reports: [report] }, actor)[0] ?? null;
  return (
    sentReportsFor({ ...INITIAL_MODERATION_STATE, reports: [report] }, actor ?? "").at(-1) ?? null
  );
}
