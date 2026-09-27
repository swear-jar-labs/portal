import {
  INITIAL_MODERATION_STATE,
  canReopenReview,
  caseForTarget,
  targetKey,
  type Complaint,
  type HiddenTarget,
  type ModerationAction,
  type ModerationAudience,
  type ModerationEvent,
  type ModerationEventKind,
  type ModerationReport,
  type ModerationState,
  type ModerationTarget,
  type ResolutionOutcome,
  visibleEvents,
} from "./model";

export type ModerationActor = { user: string; admin: boolean } | null;
export type ModerationError =
  "login" | "forbidden" | "missing" | "reason" | "stale" | "duplicate" | "transition";
export type ModerationResult = { ok: true } | { ok: false; error: ModerationError };

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 2000;
const MODERATION_STORAGE_KEY = "swearjar-moderation-v2";
const LEGACY_STORAGE_KEY = "swearjar-moderation-v1";
let state: ModerationState = INITIAL_MODERATION_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function validMessage(body: string): boolean {
  const length = body.trim().length;
  return length >= MIN_REASON_LENGTH && length <= MAX_REASON_LENGTH;
}

function event(
  kind: ModerationEventKind,
  actor: string,
  body: string,
  round: number,
  audience: readonly ModerationAudience[],
  extras: Partial<Pick<ModerationEvent, "revision" | "reporter">> = {},
): ModerationEvent {
  return {
    id: crypto.randomUUID(),
    kind,
    actor,
    body,
    at: new Date().toISOString(),
    round,
    audience,
    ...extras,
  };
}

function persistState() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      MODERATION_STORAGE_KEY,
      JSON.stringify({
        reports: state.reports,
        hidden: state.hidden,
        unavailable: [...state.unavailable],
        seenByAuthor: state.seenByAuthor,
        seenByReporter: state.seenByReporter,
      }),
    );
  } catch {
    // The in-memory mock remains usable when storage is disabled.
  }
}

function setState(next: ModerationState) {
  state = next;
  persistState();
  for (const listener of listeners) listener();
}

type LegacyReport = Pick<
  ModerationReport,
  "id" | "target" | "reporter" | "reason" | "status" | "version" | "createdAt" | "updatedAt"
> & {
  moderatorNote: string;
  correctionReady?: boolean;
  correctionSubmittedAt?: string;
};

function migrateLegacy(
  reports: readonly LegacyReport[],
  hidden: Record<string, { note: string; at: string }>,
): ModerationState {
  const cases: ModerationReport[] = [];
  for (const old of reports) {
    const { moderatorNote, ...legacyCase } = old;
    const existing = cases.find((entry) => targetKey(entry.target) === targetKey(old.target));
    const complaint: Complaint = {
      id: old.id,
      reporter: old.reporter,
      reason: old.reason,
      createdAt: old.createdAt,
      round: 1,
    };
    if (existing) {
      const index = cases.indexOf(existing);
      cases[index] = {
        ...existing,
        complaints: [...existing.complaints, complaint],
        events: [
          ...existing.events,
          event("reported", old.reporter, old.reason, 1, ["moderators", "reporters"], {
            reporter: old.reporter,
          }),
        ],
      };
      continue;
    }
    const events = [
      event("reported", old.reporter, old.reason, 1, ["moderators", "reporters"], {
        reporter: old.reporter,
      }),
      event("case-opened", "system", "", 1, ["author"]),
    ];
    if (moderatorNote)
      events.push(event("edit-requested", "admin", moderatorNote, 1, ["author", "reporters"]));
    cases.push({
      ...legacyCase,
      complaints: [complaint],
      events,
      correctionReady: old.correctionReady ?? false,
      currentBody: old.target.localBody ?? old.target.initialBody,
      currentRevision: 1,
      submittedRevision: old.correctionSubmittedAt ? 1 : undefined,
      submittedBody: old.correctionSubmittedAt ? old.target.localBody : undefined,
      reviewPending: false,
      round: 1,
    });
  }
  const nextHidden: Record<string, HiddenTarget> = {};
  for (const [key, value] of Object.entries(hidden)) {
    const found = cases.find((entry) => targetKey(entry.target) === key);
    if (found) nextHidden[key] = { ...value, caseId: found.id, permanent: false };
  }
  return { ...INITIAL_MODERATION_STATE, reports: cases, hidden: nextHidden };
}

export function hydrateModerationStore(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const saved = window.sessionStorage.getItem(MODERATION_STORAGE_KEY);
    const legacy = saved ? null : window.sessionStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed: unknown = JSON.parse(saved ?? legacy ?? "null");
    if (!parsed || typeof parsed !== "object") return;
    const record = parsed as Record<string, unknown>; // Object checked above; fields checked below.
    if (!Array.isArray(record.reports) || !Array.isArray(record.unavailable)) return;
    if (!record.hidden || typeof record.hidden !== "object") return;
    if (!record.seenByAuthor || typeof record.seenByAuthor !== "object") return;
    if (legacy) {
      state = migrateLegacy(
        record.reports as LegacyReport[],
        record.hidden as Record<string, { note: string; at: string }>,
      );
      state = { ...state, unavailable: new Set(record.unavailable as string[]) };
      persistState();
    } else {
      state = {
        reports: record.reports as ModerationReport[],
        hidden: record.hidden as ModerationState["hidden"],
        unavailable: new Set(record.unavailable as string[]),
        seenByAuthor: record.seenByAuthor as ModerationState["seenByAuthor"],
        seenByReporter: (record.seenByReporter ?? {}) as ModerationState["seenByReporter"],
      };
    }
    for (const listener of listeners) listener();
  } catch {
    // Malformed storage starts an empty mock session.
  }
}

export function subscribeModeration(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function moderationSnapshot(): ModerationState {
  return state;
}
export function moderationServerSnapshot(): ModerationState {
  return INITIAL_MODERATION_STATE;
}

export function markAuthorReportSeen(user: string, id: string): void {
  const report = state.reports.find((entry) => entry.id === id);
  if (!report || report.target.author !== user) return;
  const count = visibleEvents(report, user, "author").length;
  if (state.seenByAuthor[id] === count) return;
  setState({ ...state, seenByAuthor: { ...state.seenByAuthor, [id]: count } });
}

export function markReporterReportSeen(user: string, id: string): void {
  const report = state.reports.find((entry) =>
    entry.complaints.some((complaint) => complaint.id === id && complaint.reporter === user),
  );
  const complaint = report?.complaints.find((entry) => entry.id === id && entry.reporter === user);
  if (!report || !complaint) return;
  const key = `${user}:${id}`;
  const count = visibleEvents(report, user, "reporter").filter(
    (entry) => entry.round === complaint.round,
  ).length;
  if (state.seenByReporter[key] === count) return;
  setState({ ...state, seenByReporter: { ...state.seenByReporter, [key]: count } });
}

export function submitReport(
  actor: ModerationActor,
  target: ModerationTarget,
  reason: string,
): ModerationResult {
  if (!actor) return { ok: false, error: "login" };
  if (actor.user === target.author) return { ok: false, error: "forbidden" };
  if (!validMessage(reason)) return { ok: false, error: "reason" };
  const key = targetKey(target);
  if (state.unavailable.has(key)) return { ok: false, error: "missing" };
  const current = caseForTarget(state, target);
  const round = current?.status === "resolved" ? current.round + 1 : (current?.round ?? 1);
  if (current?.complaints.some((entry) => entry.reporter === actor.user && entry.round === round))
    return { ok: false, error: "duplicate" };
  const now = new Date().toISOString();
  const complaint: Complaint = {
    id: crypto.randomUUID(),
    reporter: actor.user,
    reason: reason.trim(),
    createdAt: now,
    round,
  };
  const reported = event(
    "reported",
    actor.user,
    reason.trim(),
    round,
    ["moderators", "reporters"],
    { reporter: actor.user },
  );
  const opened = event("case-opened", "system", "", round, ["author"]);
  if (current) {
    const hidden = { ...state.hidden };
    if (current.status === "resolved" && hidden[key])
      hidden[key] = { ...hidden[key], permanent: false };
    setState({
      ...state,
      hidden,
      seenByReporter: { ...state.seenByReporter, [`${actor.user}:${complaint.id}`]: 1 },
      reports: state.reports.map((entry) =>
        entry.id === current.id
          ? {
              ...entry,
              target: { ...entry.target, label: target.label, href: target.href },
              status: entry.status === "resolved" ? "received" : entry.status,
              complaints: [...entry.complaints, complaint],
              events: [...entry.events, reported, ...(entry.status === "resolved" ? [opened] : [])],
              round,
              resolution: entry.status === "resolved" ? undefined : entry.resolution,
              correctionReady: entry.status === "resolved" ? false : entry.correctionReady,
              correctionSubmittedAt:
                entry.status === "resolved" ? undefined : entry.correctionSubmittedAt,
              submittedRevision: entry.status === "resolved" ? undefined : entry.submittedRevision,
              submittedBody: entry.status === "resolved" ? undefined : entry.submittedBody,
              reviewPending: entry.status === "resolved" ? false : entry.reviewPending,
              appealUsedRound: entry.status === "resolved" ? undefined : entry.appealUsedRound,
              version: entry.version + 1,
              updatedAt: now,
            }
          : entry,
      ),
    });
    return { ok: true };
  }
  const report: ModerationReport = {
    id: crypto.randomUUID(),
    target,
    reporter: actor.user,
    reason: reason.trim(),
    complaints: [complaint],
    events: [reported, opened],
    status: "received",
    correctionReady: false,
    currentBody: target.initialBody ?? target.localBody,
    currentRevision: 1,
    reviewPending: false,
    round: 1,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  setState({
    ...state,
    reports: [...state.reports, report],
    seenByReporter: { ...state.seenByReporter, [`${actor.user}:${complaint.id}`]: 1 },
  });
  return { ok: true };
}

export function decideReport(
  actor: ModerationActor,
  id: string,
  version: number,
  action: ModerationAction,
  note: string,
  outcome?: ResolutionOutcome,
  complaintOutcomes?: Readonly<Partial<Record<string, ResolutionOutcome>>>,
): ModerationResult {
  if (!actor?.admin) return { ok: false, error: "forbidden" };
  const current = state.reports.find((report) => report.id === id);
  if (!current) return { ok: false, error: "missing" };
  if (current.version !== version) return { ok: false, error: "stale" };
  const key = targetKey(current.target);
  const hiddenNow = state.hidden[key] !== undefined;
  const reopenedReview = action === "review" && canReopenReview(current, hiddenNow);
  if (
    (action === "review" &&
      (state.unavailable.has(key) || (current.status !== "received" && !reopenedReview))) ||
    (action === "request-edit" && (current.status === "resolved" || state.unavailable.has(key))) ||
    (action === "resolve" && current.status === "resolved") ||
    (action === "hide" &&
      (hiddenNow || current.status === "resolved" || state.unavailable.has(key))) ||
    (action === "restore" &&
      (!hiddenNow || current.status === "resolved" || state.unavailable.has(key))) ||
    (action === "resolve" &&
      (!outcome ||
        (outcome === "corrected" &&
          (current.submittedRevision === undefined ||
            current.submittedRevision !== current.currentRevision)) ||
        (outcome === "remain-hidden" && !hiddenNow) ||
        (outcome === "deleted" && !state.unavailable.has(key)) ||
        (outcome !== "deleted" && state.unavailable.has(key)) ||
        current.complaints.some((complaint) => {
          if (complaint.round !== current.round) return false;
          const individual = complaintOutcomes?.[complaint.id] ?? outcome;
          return (
            !individual ||
            (individual === "corrected" && current.submittedRevision !== current.currentRevision) ||
            (individual === "remain-hidden" && outcome !== "remain-hidden") ||
            (individual === "deleted" && outcome !== "deleted")
          );
        })))
  )
    return { ok: false, error: "transition" };
  const trimmed = note.trim();
  if (["request-edit", "resolve", "hide"].includes(action) && !trimmed)
    return { ok: false, error: "reason" };
  const now = new Date().toISOString();
  const hidden = { ...state.hidden };
  if (action === "hide") hidden[key] = { note: trimmed, at: now, caseId: id, permanent: false };
  if (action === "restore" || (action === "resolve" && outcome !== "remain-hidden"))
    delete hidden[key];
  if (action === "resolve" && outcome === "remain-hidden" && hidden[key])
    hidden[key] = { ...hidden[key], note: trimmed, permanent: true };
  if (reopenedReview && hidden[key]) hidden[key] = { ...hidden[key], permanent: false };
  const status =
    action === "review"
      ? "reviewing"
      : action === "request-edit"
        ? "needs-edit"
        : action === "resolve"
          ? "resolved"
          : current.status === "received"
            ? "reviewing"
            : current.status;
  const kind: Record<ModerationAction, ModerationEventKind> = {
    review: "review-started",
    "request-edit": "edit-requested",
    resolve: "resolved",
    hide: "hidden",
    restore: "restored",
  };
  const audience: ModerationAudience[] =
    action === "request-edit" || action === "hide" ? ["author"] : ["author", "reporters"];
  const events = [
    ...current.events,
    event(kind[action], actor.user, trimmed, current.round, audience, {
      revision: current.currentRevision,
    }),
  ];
  const resolution =
    action === "resolve" ? outcome : reopenedReview ? undefined : current.resolution;
  setState({
    ...state,
    hidden,
    reports: state.reports.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            status,
            events,
            correctionReady: action === "request-edit" ? false : entry.correctionReady,
            correctionSubmittedAt:
              action === "request-edit" ? undefined : entry.correctionSubmittedAt,
            submittedRevision: action === "request-edit" ? undefined : entry.submittedRevision,
            submittedBody: action === "request-edit" ? undefined : entry.submittedBody,
            reviewPending: false,
            resolution,
            complaints:
              action === "resolve"
                ? entry.complaints.map((complaint) =>
                    complaint.round === entry.round
                      ? { ...complaint, outcome: complaintOutcomes?.[complaint.id] ?? outcome }
                      : complaint,
                  )
                : reopenedReview
                  ? entry.complaints.map((complaint) =>
                      complaint.round === entry.round
                        ? { ...complaint, outcome: undefined }
                        : complaint,
                    )
                  : entry.complaints,
            version: entry.version + 1,
            updatedAt: now,
          }
        : entry,
    ),
  });
  return { ok: true };
}

export function markEdited(
  actor: ModerationActor,
  target: ModerationTarget,
  body: string,
): ModerationResult {
  const current = caseForTarget(state, target);
  if (!actor || !current || current.target.author !== actor.user)
    return { ok: false, error: "forbidden" };
  if (state.unavailable.has(targetKey(target))) return { ok: false, error: "missing" };
  if (!body.trim() || body === current.currentBody) return { ok: false, error: "transition" };
  const now = new Date().toISOString();
  setState({
    ...state,
    reports: state.reports.map((entry) =>
      entry.id === current.id
        ? {
            ...entry,
            target:
              entry.target.localBody === undefined
                ? entry.target
                : { ...entry.target, localBody: body },
            currentBody: body,
            currentRevision: entry.currentRevision + 1,
            correctionReady:
              entry.status === "needs-edit" || entry.status === "correction-submitted",
            version: entry.version + 1,
            updatedAt: now,
          }
        : entry,
    ),
  });
  return { ok: true };
}

export function markCorrected(
  actor: ModerationActor,
  target: ModerationTarget,
  message = "",
): ModerationResult {
  const current = caseForTarget(state, target);
  if (!actor || !current || current.target.author !== actor.user)
    return { ok: false, error: "forbidden" };
  if (state.unavailable.has(targetKey(target))) return { ok: false, error: "missing" };
  if (
    !current.correctionReady ||
    !["needs-edit", "correction-submitted"].includes(current.status) ||
    current.currentBody === undefined
  )
    return { ok: false, error: "transition" };
  if (message && !validMessage(message)) return { ok: false, error: "reason" };
  const now = new Date().toISOString();
  const submitted = event(
    "correction-submitted",
    actor.user,
    message.trim(),
    current.round,
    ["moderators", "author"],
    { revision: current.currentRevision },
  );
  const events = [...current.events, submitted];
  setState({
    ...state,
    seenByAuthor: {
      ...state.seenByAuthor,
      [current.id]: visibleEvents({ ...current, events }, actor.user, "author").length,
    },
    reports: state.reports.map((entry) =>
      entry.id === current.id
        ? {
            ...entry,
            status: "correction-submitted",
            correctionReady: false,
            correctionSubmittedAt: now,
            submittedRevision: entry.currentRevision,
            submittedBody: entry.currentBody,
            events,
            reviewPending: false,
            version: entry.version + 1,
            updatedAt: now,
          }
        : entry,
    ),
  });
  return { ok: true };
}

export function respondToRequest(
  actor: ModerationActor,
  target: ModerationTarget,
  body: string,
): ModerationResult {
  const current = caseForTarget(state, target);
  if (!actor || !current || current.target.author !== actor.user)
    return { ok: false, error: "forbidden" };
  if (current.status !== "needs-edit" || current.reviewPending)
    return { ok: false, error: "transition" };
  if (!validMessage(body)) return { ok: false, error: "reason" };
  const now = new Date().toISOString();
  const events = [
    ...current.events,
    event("author-response", actor.user, body.trim(), current.round, ["moderators", "author"]),
  ];
  setState({
    ...state,
    seenByAuthor: {
      ...state.seenByAuthor,
      [current.id]: visibleEvents({ ...current, events }, actor.user, "author").length,
    },
    reports: state.reports.map((entry) =>
      entry.id === current.id
        ? {
            ...entry,
            status: "reviewing",
            reviewPending: true,
            events,
            version: entry.version + 1,
            updatedAt: now,
          }
        : entry,
    ),
  });
  return { ok: true };
}

export function requestReview(
  actor: ModerationActor,
  target: ModerationTarget,
  body: string,
): ModerationResult {
  const current = caseForTarget(state, target);
  if (!actor || !current || current.target.author !== actor.user)
    return { ok: false, error: "forbidden" };
  if (!state.hidden[targetKey(target)]) return { ok: false, error: "transition" };
  if (!validMessage(body)) return { ok: false, error: "reason" };
  if (current.reviewPending) return { ok: false, error: "duplicate" };
  const now = new Date().toISOString();
  const eventItem = event("review-requested", actor.user, body.trim(), current.round, [
    "moderators",
    "author",
  ]);
  const events = [...current.events, eventItem];
  const seenByAuthor = {
    ...state.seenByAuthor,
    [current.id]: visibleEvents({ ...current, events }, actor.user, "author").length,
  };
  if (current.appealUsedRound === current.round && current.status === "resolved") {
    setState({
      ...state,
      seenByAuthor,
      reports: state.reports.map((entry) =>
        entry.id === current.id
          ? {
              ...entry,
              events,
              version: entry.version + 1,
              updatedAt: now,
            }
          : entry,
      ),
    });
    return { ok: true };
  }
  const key = targetKey(target);
  const hidden = { ...state.hidden };
  if (current.status === "resolved" && hidden[key])
    hidden[key] = { ...hidden[key], permanent: false };
  setState({
    ...state,
    hidden,
    seenByAuthor,
    reports: state.reports.map((entry) =>
      entry.id === current.id
        ? {
            ...entry,
            status: entry.status === "needs-edit" ? "needs-edit" : "reviewing",
            reviewPending: true,
            appealUsedRound: entry.round,
            resolution: entry.status === "resolved" ? undefined : entry.resolution,
            complaints:
              entry.status === "resolved"
                ? entry.complaints.map((complaint) =>
                    complaint.round === entry.round
                      ? { ...complaint, outcome: undefined }
                      : complaint,
                  )
                : entry.complaints,
            events,
            version: entry.version + 1,
            updatedAt: now,
          }
        : entry,
    ),
  });
  return { ok: true };
}

export function markTargetUnavailable(target: ModerationTarget): void {
  const unavailable = new Set(state.unavailable);
  unavailable.add(targetKey(target));
  setState({ ...state, unavailable });
}

export function resetModerationStore(): void {
  setState(INITIAL_MODERATION_STATE);
}
