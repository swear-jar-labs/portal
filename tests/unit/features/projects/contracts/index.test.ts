import { describe, expect, it } from "vitest";
import * as projectsContract from "@/features/projects/contracts";

describe("projects contract", () => {
  it("publishes exactly the agreed surface", () => {
    expect(Object.keys(projectsContract).sort()).toEqual([
      "DEFAULT_CLAIM_POLICY",
      "MAX_POLICY_NEED",
      "MAX_PROJECT_NOTE_LENGTH",
      "MIN_POLICY_NEED",
      "PROJECTS_PATH",
      "archivedProjectSlugs",
      "decideProject",
      "dynamicTicketPrefix",
      "fixtureTicketPrefixes",
      "getProject",
      "isFixtureProjectSlug",
      "isKnownProjectSlug",
      "listMemberProjects",
      "listProjectSubmissions",
      "listProjects",
      "livePoliciesByProject",
      "policyForProject",
      "projectCardId",
      "projectName",
      "projectPath",
      "projectSlugs",
      "projectStatusTones",
      "projectStoreServerSnapshot",
      "projectStoreSnapshot",
      "projectTeamManagePath",
      "subscribeProjectStore",
    ]);
  });
});
