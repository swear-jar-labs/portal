import { beforeEach, describe, expect, it } from "vitest";
import {
  canReopenReview,
  contentReportsFor,
  publicReport,
  sentReportsFor,
  visibleEvents,
  type ModerationTarget,
  type ResolutionOutcome,
} from "@/features/moderation/model";
import {
  decideReport,
  markAuthorReportSeen,
  markCorrected,
  markEdited,
  markReporterReportSeen,
  markTargetUnavailable,
  moderationSnapshot,
  requestReview,
  resetModerationStore,
  respondToRequest,
  submitReport,
} from "@/features/moderation/store";

const ada = { user: "ada", admin: false };
const lin = { user: "lin", admin: false };
const ken = { user: "ken", admin: false };
const admin = { user: "admin", admin: true };
const target: ModerationTarget = {
  kind: "post",
  id: "post-one",
  author: lin.user,
  label: "A thread",
  href: "/forum/thread#board-post-post-one",
  initialBody: "Original post",
};

beforeEach(resetModerationStore);

function current() {
  const report = moderationSnapshot().reports[0];
  if (!report) throw new Error("case was not created");
  return report;
}

function report(actor = ada, reason = "This contains a private address.") {
  expect(submitReport(actor, target, reason)).toEqual({ ok: true });
  return current();
}

function resolve(
  outcome: ResolutionOutcome,
  complaintOutcomes?: Record<string, ResolutionOutcome>,
) {
  const report = current();
  return decideReport(
    admin,
    report.id,
    report.version,
    "resolve",
    "Decision explained to all parties.",
    outcome,
    complaintOutcomes,
  );
}

describe("one case per material", () => {
  it("groups private complaints without revealing identity or reason to the author", () => {
    const first = report();
    expect(contentReportsFor(moderationSnapshot(), lin.user)).toHaveLength(1);
    expect(publicReport(first, lin.user, false)).toMatchObject({
      reporter: "",
      reason: "",
      complaints: [],
    });
    expect(publicReport(first, "stranger", false)).toBeNull();
    expect(submitReport(ken, target, "A different problem in this post.")).toEqual({ ok: true });
    expect(moderationSnapshot().reports).toHaveLength(1);
    expect(current().complaints).toHaveLength(2);
    expect(sentReportsFor(moderationSnapshot(), ada.user)[0]).toMatchObject({
      reason: "This contains a private address.",
    });
    expect(
      sentReportsFor(moderationSnapshot(), ada.user)[0]?.events.some(
        (event) => event.reporter === ken.user,
      ),
    ).toBe(false);
    expect(
      contentReportsFor(moderationSnapshot(), lin.user)[0]?.events.every(
        (event) => event.kind !== "reported",
      ),
    ).toBe(true);
    expect(submitReport(ada, target, "Another issue in the same round.")).toEqual({
      ok: false,
      error: "duplicate",
    });
    expect(submitReport(lin, target, "A complaint on my own post.")).toEqual({
      ok: false,
      error: "forbidden",
    });
  });

  it("tracks unread messages for each recipient, without marking private complaints new for the author", () => {
    const first = report();
    expect(visibleEvents(first, lin.user, "author")).toHaveLength(1);
    markAuthorReportSeen(lin.user, first.id);
    expect(moderationSnapshot().seenByAuthor[first.id]).toBe(1);
    report(ken, "Another sensitive issue is present.");
    expect(visibleEvents(current(), lin.user, "author")).toHaveLength(1);
    expect(moderationSnapshot().seenByAuthor[first.id]).toBe(1);
    const ownComplaint = sentReportsFor(moderationSnapshot(), ada.user)[0];
    if (!ownComplaint) throw new Error("complaint was not found");
    markReporterReportSeen(ada.user, ownComplaint.id);
    expect(moderationSnapshot().seenByReporter[`${ada.user}:${ownComplaint.id}`]).toBe(1);
    expect(
      decideReport(admin, current().id, current().version, "request-edit", "Remove the address."),
    ).toEqual({ ok: true });
    expect(visibleEvents(current(), lin.user, "author")).toHaveLength(2);
    expect(sentReportsFor(moderationSnapshot(), ada.user)[0]?.events).toHaveLength(1);
  });
});

describe("decisions and corrections", () => {
  it("requires a current version, note and case outcome, then applies the outcome to every complaint", () => {
    const first = report();
    report(ken, "Another sensitive issue is present.");
    expect(decideReport(admin, first.id, first.version, "hide", "Sensitive data")).toEqual({
      ok: false,
      error: "stale",
    });
    expect(decideReport(ada, current().id, current().version, "hide", "Sensitive data")).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(decideReport(admin, current().id, current().version, "hide", " ")).toEqual({
      ok: false,
      error: "reason",
    });
    expect(decideReport(admin, current().id, current().version, "resolve", "Explained.")).toEqual({
      ok: false,
      error: "transition",
    });
    expect(resolve("no-violation")).toEqual({ ok: true });
    expect(current().complaints.every((complaint) => complaint.outcome === "no-violation")).toBe(
      true,
    );
  });

  it("sends a correction only after a saved revision and blocks a stale revision from corrected resolution", () => {
    report();
    expect(
      decideReport(admin, current().id, current().version, "request-edit", "Remove the address."),
    ).toEqual({ ok: true });
    expect(markCorrected(lin, target)).toEqual({ ok: false, error: "transition" });
    expect(markEdited(lin, target, "Address removed.")).toEqual({ ok: true });
    expect(markCorrected(ken, target)).toEqual({ ok: false, error: "forbidden" });
    expect(markCorrected(lin, target)).toEqual({ ok: true });
    expect(current()).toMatchObject({
      status: "correction-submitted",
      submittedRevision: 2,
      submittedBody: "Address removed.",
    });
    expect(markEdited(lin, target, "Second edit after submission.")).toEqual({ ok: true });
    expect(resolve("corrected")).toEqual({ ok: false, error: "transition" });
    expect(markCorrected(lin, target)).toEqual({ ok: true });
    expect(current().submittedRevision).toBe(3);
    expect(resolve("corrected")).toEqual({ ok: true });
    expect(current().status).toBe("resolved");
  });

  it("lets the admin override one reporter's outcome when complaints differ", () => {
    report();
    report(ken, "A separate issue in the same post.");
    expect(
      decideReport(admin, current().id, current().version, "request-edit", "Remove the address."),
    ).toEqual({ ok: true });
    expect(markEdited(lin, target, "Address removed; name remains public.")).toEqual({ ok: true });
    expect(markCorrected(lin, target)).toEqual({ ok: true });
    const other = current().complaints.find((complaint) => complaint.reporter === ken.user);
    if (!other) throw new Error("second complaint was not found");
    expect(resolve("corrected", { [other.id]: "no-violation" })).toEqual({ ok: true });
    expect(sentReportsFor(moderationSnapshot(), ada.user)[0]?.resolution).toBe("corrected");
    expect(sentReportsFor(moderationSnapshot(), ken.user)[0]?.resolution).toBe("no-violation");
  });

  it("rejects an individual hidden outcome when the case restores the material", () => {
    report();
    report(ken, "A separate issue in the same post.");
    expect(
      decideReport(admin, current().id, current().version, "hide", "Check the address."),
    ).toEqual({ ok: true });
    const other = current().complaints.find((complaint) => complaint.reporter === ken.user);
    if (!other) throw new Error("second complaint was not found");
    expect(resolve("no-violation", { [other.id]: "remain-hidden" })).toEqual({
      ok: false,
      error: "transition",
    });
  });

  it("lets an author respond to an edit request without claiming an edit was made", () => {
    report();
    expect(
      decideReport(
        admin,
        current().id,
        current().version,
        "request-edit",
        "Please explain the source.",
      ),
    ).toEqual({ ok: true });
    expect(respondToRequest(lin, target, "The source is public documentation.")).toEqual({
      ok: true,
    });
    expect(current()).toMatchObject({
      status: "reviewing",
      reviewPending: true,
      submittedRevision: undefined,
    });
    expect(current().events.at(-1)?.kind).toBe("author-response");
    expect(respondToRequest(lin, target, "Another explanation for the moderator.")).toEqual({
      ok: false,
      error: "transition",
    });
  });

  it("keeps visibility and resolution together, with an explicit permanent hidden outcome", () => {
    report();
    expect(decideReport(admin, current().id, current().version, "hide", "Private detail.")).toEqual(
      { ok: true },
    );
    expect(moderationSnapshot().hidden["post:post-one"]?.permanent).toBe(false);
    expect(resolve("remain-hidden")).toEqual({ ok: true });
    expect(moderationSnapshot().hidden["post:post-one"]?.permanent).toBe(true);
    expect(current().status).toBe("resolved");
  });
});

describe("review, rounds, and deletion", () => {
  it("adds an author's review request to the same case and reopens a resolved hidden case only once", () => {
    report();
    expect(decideReport(admin, current().id, current().version, "hide", "Needs review.")).toEqual({
      ok: true,
    });
    expect(resolve("remain-hidden")).toEqual({ ok: true });
    const caseId = current().id;
    expect(requestReview(lin, target, "Please reconsider the hiding decision.")).toEqual({
      ok: true,
    });
    expect(current()).toMatchObject({ id: caseId, status: "reviewing", reviewPending: true });
    expect(moderationSnapshot().hidden["post:post-one"]?.permanent).toBe(false);
    expect(requestReview(lin, target, "I have more information to add.")).toEqual({
      ok: false,
      error: "duplicate",
    });
    expect(resolve("remain-hidden")).toEqual({ ok: true });
    expect(requestReview(lin, target, "Here is additional context for the case.")).toEqual({
      ok: true,
    });
    expect(current()).toMatchObject({ status: "resolved", reviewPending: false });
    expect(current().events.at(-1)?.kind).toBe("review-requested");
    expect(canReopenReview(current(), true)).toBe(true);
    expect(decideReport(admin, current().id, current().version, "review", "")).toEqual({
      ok: true,
    });
    expect(current()).toMatchObject({ status: "reviewing", resolution: undefined });
    expect(current().complaints[0]?.outcome).toBeUndefined();
    expect(moderationSnapshot().hidden["post:post-one"]?.permanent).toBe(false);
    expect(canReopenReview(current(), true)).toBe(false);
    expect(resolve("remain-hidden")).toEqual({ ok: true });
  });

  it("starts another round in the same case without changing the earlier reporter's result", () => {
    const first = report();
    expect(resolve("no-violation")).toEqual({ ok: true });
    expect(submitReport(ken, target, "A new concern after the first decision.")).toEqual({
      ok: true,
    });
    expect(current()).toMatchObject({ id: first.id, round: 2, status: "received" });
    expect(sentReportsFor(moderationSnapshot(), ada.user)[0]).toMatchObject({
      status: "resolved",
      resolution: "no-violation",
    });
    expect(sentReportsFor(moderationSnapshot(), ken.user)[0]).toMatchObject({ status: "received" });
  });

  it("lets the same reporter file a new complaint after their earlier case was resolved", () => {
    const first = report();
    expect(resolve("no-violation")).toEqual({ ok: true });
    expect(submitReport(ada, target, "A different issue after the decision.")).toEqual({
      ok: true,
    });
    expect(current()).toMatchObject({ id: first.id, round: 2, status: "received" });
    expect(sentReportsFor(moderationSnapshot(), ada.user)).toHaveLength(2);
    expect(sentReportsFor(moderationSnapshot(), ada.user).map((entry) => entry.status)).toEqual([
      "resolved",
      "received",
    ]);
  });

  it("closes a deleted material with a deleted outcome and retains history", () => {
    report();
    markTargetUnavailable(target);
    expect(decideReport(admin, current().id, current().version, "hide", "Remove this.")).toEqual({
      ok: false,
      error: "transition",
    });
    expect(submitReport(ken, target, "Another concern here.")).toEqual({
      ok: false,
      error: "missing",
    });
    expect(resolve("deleted")).toEqual({ ok: true });
    expect(current().status).toBe("resolved");
    expect(current().events.some((event) => event.kind === "resolved")).toBe(true);
  });
});
