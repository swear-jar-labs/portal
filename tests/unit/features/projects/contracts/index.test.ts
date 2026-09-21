import { describe, expect, it } from "vitest";
import * as projectsContract from "@/features/projects/contracts";

describe("projects contract", () => {
  it("publishes exactly the agreed surface", () => {
    expect(Object.keys(projectsContract).sort()).toEqual([
      "DEFAULT_CLAIM_POLICY",
      "MAX_POLICY_NEED",
      "MIN_POLICY_NEED",
      "archivedProjectSlugs",
      "isProjectSlug",
      "listProjects",
      "livePoliciesByProject",
      "policyForProject",
      "projectName",
      "projectPath",
      "projectSlugs",
      "projectStoreServerSnapshot",
      "projectStoreSnapshot",
      "subscribeProjectStore",
    ]);
  });
});
