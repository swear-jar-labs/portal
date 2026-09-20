import { describe, expect, it } from "vitest";
import { collectActivity } from "@/features/projects/activity";
import { projectSlugs } from "@/features/projects/projects";

describe("collectActivity", () => {
  it("reads the freshest journal activity per slug through the board", async () => {
    const activity = await collectActivity(
      [...projectSlugs],
      Date.parse("2026-09-20T00:00:00.000Z"),
    );
    expect(activity).toEqual({
      "swearjar-dos": "2026-09-18T09:00:00.000Z",
      compiler: "2026-09-17T08:20:00.000Z",
      tooling: "2026-09-16T06:05:00.000Z",
      "token-cache": "2026-08-30T14:00:00.000Z",
    });
  });
});
