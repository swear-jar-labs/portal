import { describe, expect, it } from "vitest";
import * as projectsContract from "@/features/projects/contracts";

describe("projects contract", () => {
  it("publishes exactly the agreed surface", () => {
    expect(Object.keys(projectsContract).sort()).toEqual([
      "DEFAULT_CLAIM_POLICY",
      "MAX_POLICY_NEED",
      "MAX_PROJECT_NOTE_LENGTH",
      "MIN_POLICY_NEED",
      "archivedProjectSlugs",
      "decideProject",
      "dynamicTicketPrefix",
      "fixtureTicketPrefixes",
      "getProject",
      "isFixtureProjectSlug",
      "isKnownProjectSlug",
      "listProjectSubmissions",
      "listProjects",
      "livePoliciesByProject",
      "policyForProject",
      "projectName",
      "projectPath",
      "projectSlugs",
      "projectStoreServerSnapshot",
      "projectStoreSnapshot",
      "projectTeamManagePath",
      "subscribeProjectStore",
    ]);
  });
});
