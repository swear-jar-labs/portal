import { describe, expect, expectTypeOf, it } from "vitest";
import * as projectsUi from "@/features/projects/contracts/ui";
import type { ProjectRowsProps } from "@/features/projects/contracts/ui";

describe("projects ui contract", () => {
  it("publishes exactly the agreed surface", () => {
    expect(Object.keys(projectsUi).sort()).toEqual(["ProjectRows"]);
  });

  it("keeps the published rows props type importable", () => {
    expectTypeOf<ProjectRowsProps>().toHaveProperty("projects");
  });
});
