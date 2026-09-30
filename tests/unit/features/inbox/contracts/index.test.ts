import { describe, expect, it } from "vitest";
import * as inboxContract from "@/features/inbox/contracts";

describe("inbox contract", () => {
  it("publishes exactly the agreed surface", () => {
    expect(Object.keys(inboxContract).sort()).toEqual([
      "buildApplicationDecisionEvents",
      "buildApplicationRespondedEvents",
      "buildApplicationSubmittedEvents",
      "buildMaintainerLostEvents",
      "buildMentionEvents",
      "buildModerationDecisionEvents",
      "buildProjectDecisionEvents",
      "buildProjectRespondedEvents",
      "buildProjectSubmittedEvents",
      "buildReadroomOpenedEvents",
      "buildReadroomReportEvents",
      "buildReplyEvents",
      "buildTeamEvents",
      "buildTicketAssignEvents",
      "buildTicketCommentEvents",
      "buildTicketCreatedEvents",
      "buildTicketStallEvents",
      "buildTicketStatusEvents",
      "enqueueInboxEvent",
      "mentionExcerpt",
      "mentionRedactedBody",
      "mentionSubject",
      "sectionEventId",
      "uniqueEventRecipients",
      "useMentionNotifier",
    ]);
  });
});
