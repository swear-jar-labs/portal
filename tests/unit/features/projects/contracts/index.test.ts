import { describe, expect, it } from "vitest";
import * as projectsContract from "@/features/projects/contracts";

describe("projects contract", () => {
  it("publishes exactly the agreed surface", () => {
    expect(Object.keys(projectsContract).sort()).toEqual([
      "archivedProjectSlugs",
      "isProjectSlug",
      "projectName",
      "projectSlugs",
    ]);
  });
});
