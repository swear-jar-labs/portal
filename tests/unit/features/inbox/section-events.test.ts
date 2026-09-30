import { describe, expect, it } from "vitest";
import {
  buildApplicationDecisionEvents,
  buildApplicationRespondedEvents,
  buildApplicationSubmittedEvents,
  buildMaintainerLostEvents,
  buildModerationDecisionEvents,
  buildProjectRespondedEvents,
  buildProjectSubmittedEvents,
  buildProjectDecisionEvents,
  buildReadroomOpenedEvents,
  buildReadroomReportEvents,
  buildReplyEvents,
  buildTeamEvents,
  buildTicketAssignEvents,
  buildTicketCommentEvents,
  buildTicketCreatedEvents,
  buildTicketStallEvents,
  buildTicketStatusEvents,
  sectionEventId,
  uniqueEventRecipients,
} from "@/features/inbox/section-events";

const AT = "2026-09-30T10:00:00.000Z";

describe("uniqueEventRecipients", () => {
  it("dedupes, drops blanks and excludes the actor", () => {
    expect(uniqueEventRecipients(["ada", "ada", null, undefined, "grace"], "ada")).toEqual([
      "grace",
    ]);
  });
});

describe("sectionEventId", () => {
  it("is stable per kind, entity and recipient", () => {
    expect(sectionEventId("reply", "p1", "ada")).toBe("reply:p1:ada");
    expect(sectionEventId("reply", "p1", "ada")).toBe(sectionEventId("reply", "p1", "ada"));
  });
});

describe("buildReplyEvents", () => {
  it("notifies the thread and parent authors once, never the actor", () => {
    const deliveries = buildReplyEvents({
      postId: "p9",
      threadTitle: "read-first",
      boardLabel: "FORUM",
      actorUser: "grace",
      actorName: "grace",
      threadAuthor: "ada",
      parentAuthor: "ada",
      target: { kind: "thread", label: "read-first", href: "/forum/t1" },
      at: AT,
    });
    expect(deliveries.map((entry) => entry.user)).toEqual(["ada"]);
    expect(deliveries[0]?.event.id).toBe("reply:p9:ada");
    expect(deliveries[0]?.event.kind).toBe("reply");
  });
});

describe("ticket events", () => {
  it("comments reach author, assignee and earlier voices", () => {
    const deliveries = buildTicketCommentEvents({
      commentId: "c1",
      ticketKey: "DOS-3",
      projectLabel: "SWEARJAR.DOS",
      actorUser: "lin",
      actorName: "lin",
      ticketAuthor: "ada",
      assignee: "grace",
      priorCommenters: ["grace", "ken"],
      target: { kind: "ticket", label: "DOS-3", href: "/tickets/DOS-3" },
      at: AT,
    });
    expect(deliveries.map((entry) => entry.user).sort()).toEqual(["ada", "grace", "ken"]);
  });

  it("new tasks reach leads and maintainers, never the opener", () => {
    const deliveries = buildTicketCreatedEvents({
      ticketId: "t-dos-9",
      ticketKey: "DOS-9",
      projectLabel: "SWEARJAR.DOS",
      actorUser: "ken",
      actorName: "ken",
      leadsAndMaintainers: ["ada", "grace", "ken"],
      target: { kind: "ticket", label: "DOS-9", href: "/tickets/DOS-9" },
      at: AT,
    });
    expect(deliveries.map((entry) => entry.user).sort()).toEqual(["ada", "grace"]);
  });

  it("status moves name the transition", () => {
    const deliveries = buildTicketStatusEvents({
      ticketId: "t-dos-3",
      ticketKey: "DOS-3",
      from: "open",
      to: "review",
      projectLabel: "SWEARJAR.DOS",
      actorUser: "lin",
      actorName: "lin",
      ticketAuthor: "ada",
      assignee: "grace",
      target: { kind: "ticket", label: "DOS-3", href: "/tickets/DOS-3" },
      at: AT,
    });
    expect(deliveries).toHaveLength(2);
    expect(deliveries[0]?.event.subject).toContain("DOS-3");
  });

  it("assign handover covers the author and both ends", () => {
    const deliveries = buildTicketAssignEvents({
      ticketId: "t-dos-3",
      ticketKey: "DOS-3",
      projectLabel: "SWEARJAR.DOS",
      actorUser: "ken",
      actorName: "ken",
      previousAssignee: "lin",
      nextAssignee: "ken",
      ticketAuthor: "ada",
      target: { kind: "ticket", label: "DOS-3", href: "/tickets/DOS-3" },
      at: AT,
    });
    expect(deliveries.map((entry) => entry.user).sort()).toEqual(["ada", "lin"]);
  });

  it("stalls page maintainers and the lead, never the viewer", () => {
    const deliveries = buildTicketStallEvents({
      ticketId: "t-dos-3",
      ticketKey: "DOS-3",
      projectLabel: "SWEARJAR.DOS",
      actorUser: "ada",
      maintainers: ["ada", "grace"],
      lead: "lin",
      target: { kind: "ticket", label: "DOS-3", href: "/tickets/DOS-3" },
      at: AT,
    });
    expect(deliveries.map((entry) => entry.user).sort()).toEqual(["grace", "lin"]);
  });
});

describe("account and project decisions", () => {
  it("application decisions reach the applicant only", () => {
    const deliveries = buildApplicationDecisionEvents({
      applicationId: "app-1",
      decision: "approved",
      actorUser: "admin",
      actorName: "admin",
      applicant: "demo-candidate",
      target: { kind: "application", label: "application", href: "/profile" },
      at: AT,
    });
    expect(deliveries.map((entry) => entry.user)).toEqual(["demo-candidate"]);
    expect(deliveries[0]?.event.kind).toBe("application");
  });

  it("project decisions reach the proposer", () => {
    const deliveries = buildProjectDecisionEvents({
      proposalId: "prop-1",
      projectLabel: "TOOLING",
      decision: "approved",
      actorUser: "admin",
      actorName: "admin",
      proposer: "grace",
      target: { kind: "project", label: "tooling", href: "/projects/tooling" },
      at: AT,
    });
    expect(deliveries.map((entry) => entry.user)).toEqual(["grace"]);
  });

  it("submissions page the admins, never the author", () => {
    const adminTarget = { kind: "application" as const, label: "admin queue", href: "/admin" };
    const submitted = buildApplicationSubmittedEvents({
      applicationId: "app-1",
      applicant: "demo-candidate",
      applicantName: "demo-candidate",
      admins: ["admin", "coadmin", "demo-candidate"],
      target: adminTarget,
      at: AT,
    });
    expect(submitted.map((entry) => entry.user).sort()).toEqual(["admin", "coadmin"]);
    const responded = buildApplicationRespondedEvents({
      applicationId: "app-1",
      applicant: "demo-candidate",
      applicantName: "demo-candidate",
      admins: ["admin", "coadmin"],
      target: adminTarget,
      at: AT,
    });
    expect(responded[0]?.event.id).toBe("application:app-1:responded:admin");
    const projectTarget = { kind: "project" as const, label: "tooling", href: "/admin" };
    const proposed = buildProjectSubmittedEvents({
      proposalId: "prop-1",
      projectName: "TOOLING",
      proposer: "grace",
      proposerName: "grace",
      admins: ["admin", "coadmin"],
      target: projectTarget,
      at: AT,
    });
    expect(proposed.map((entry) => entry.user).sort()).toEqual(["admin", "coadmin"]);
    const answered = buildProjectRespondedEvents({
      proposalId: "prop-1",
      projectName: "TOOLING",
      proposer: "grace",
      proposerName: "grace",
      admins: ["admin"],
      target: projectTarget,
      at: AT,
    });
    expect(answered.map((entry) => entry.user)).toEqual(["admin"]);
  });
});

describe("team events", () => {
  it("joins inform leads and maintainers, never the joiner", () => {
    const deliveries = buildTeamEvents({
      projectSlug: "tooling",
      projectLabel: "TOOLING",
      action: "join",
      actorUser: "ken",
      actorName: "ken",
      affected: "ken",
      leadsAndMaintainers: ["ada", "grace"],
      target: { kind: "project", label: "tooling", href: "/projects/tooling" },
      at: AT,
    });
    expect(deliveries.map((entry) => entry.user).sort()).toEqual(["ada", "grace"]);
  });

  it("role changes notify the affected member, not the actor", () => {
    const deliveries = buildTeamEvents({
      projectSlug: "tooling",
      projectLabel: "TOOLING",
      action: "role",
      actorUser: "ada",
      actorName: "ada",
      affected: "ken",
      leadsAndMaintainers: ["ada"],
      target: { kind: "project", label: "tooling", href: "/projects/tooling" },
      at: AT,
    });
    expect(deliveries.map((entry) => entry.user)).toEqual(["ken"]);
  });
});

describe("readroom events", () => {
  it("reports reach note authors without duplicates", () => {
    const deliveries = buildReadroomReportEvents({
      readroomId: "bump",
      taskTitle: "bump-allocator",
      actorUser: "ada",
      actorName: "ada",
      noteAuthors: ["grace", "grace", "ken"],
      target: { kind: "readroom", label: "bump-allocator", href: "/readroom/bump" },
      at: AT,
    });
    expect(deliveries.map((entry) => entry.user).sort()).toEqual(["grace", "ken"]);
    expect(deliveries[0]?.event.id).toContain("bump:report");
  });

  it("deadline opening names the task only and fires once per id", () => {
    const first = buildReadroomOpenedEvents({
      readroomId: "bump",
      taskTitle: "bump-allocator",
      noteAuthors: ["grace"],
      target: { kind: "readroom", label: "bump-allocator", href: "/readroom/bump" },
      at: AT,
    });
    const second = buildReadroomOpenedEvents({
      readroomId: "bump",
      taskTitle: "bump-allocator",
      noteAuthors: ["grace"],
      target: { kind: "readroom", label: "bump-allocator", href: "/readroom/bump" },
      at: AT,
    });
    expect(first[0]?.event.id).toBe(second[0]?.event.id);
    expect(first[0]?.event.body).toBe("bump-allocator");
  });
});

describe("maintainer loss", () => {
  it("notifies admins once, never the actor", () => {
    const deliveries = buildMaintainerLostEvents({
      projectSlug: "tooling",
      projectLabel: "TOOLING",
      actorUser: "admin",
      actorName: "admin",
      admins: ["admin", "coadmin"],
      target: { kind: "project", label: "tooling", href: "/admin" },
      at: AT,
    });
    expect(deliveries.map((entry) => entry.user)).toEqual(["coadmin"]);
    expect(deliveries[0]?.event.subject).toContain("lost its last Maintainer");
  });
});

describe("moderation events", () => {
  it("decisions reach the reporter and the target author", () => {
    const deliveries = buildModerationDecisionEvents({
      reportId: "r1",
      outcome: "hidden",
      actorUser: "admin",
      actorName: "admin",
      reporters: ["grace"],
      targetAuthor: "ken",
      targetLabel: "read-first",
      target: { kind: "thread", label: "read-first", href: "/forum/t1" },
      at: AT,
    });
    expect(deliveries.map((entry) => entry.user).sort()).toEqual(["grace", "ken"]);
    expect(deliveries[0]?.event.kind).toBe("review");
  });
});
