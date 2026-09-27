import { describe, expect, it } from "vitest";
import { projectScreenshotAlt } from "@/features/projects/model/project-image";

describe("project screenshot descriptions", () => {
  it("uses the project and readable file stem without a visible caption field", () => {
    expect(projectScreenshotAlt("Compiler", "parser-diagnostics.png", 2)).toBe(
      "Compiler: parser diagnostics",
    );
    expect(projectScreenshotAlt("Compiler", ".png", 2)).toBe("Compiler screenshot 2");
  });
});
