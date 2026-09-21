import { describe, expect, it } from "vitest";
import {
  ticketAssigneeSchema,
  ticketComposeSchema,
  ticketEditSchema,
} from "@/features/tickets/schema";

const draft = {
  title: "A title",
  body: "A body.",
  size: "M",
  priority: "high",
  status: "open",
  tags: ["bug"],
} as const;

describe("ticket edit schema", () => {
  it("accepts a complete draft without a project", () => {
    expect(ticketEditSchema.safeParse(draft).success).toBe(true);
  });

  it("refuses an empty title, an empty body and too many tags", () => {
    expect(ticketEditSchema.safeParse({ ...draft, title: "  " }).success).toBe(false);
    expect(ticketEditSchema.safeParse({ ...draft, body: "" }).success).toBe(false);
    expect(
      ticketEditSchema.safeParse({ ...draft, tags: ["bug", "docs", "feature", "testing"] }).success,
    ).toBe(false);
  });

  it("drops the project the composer schema carries", () => {
    const parsed = ticketEditSchema.parse({ ...draft, project: "compiler" });
    expect(parsed).not.toHaveProperty("project");
    expect(ticketComposeSchema.safeParse({ ...draft, project: "compiler" }).success).toBe(true);
  });

  it("names the new assignee by user, lowercased", () => {
    expect(ticketAssigneeSchema.safeParse("Ken").data).toBe("ken");
    expect(ticketAssigneeSchema.safeParse("x").success).toBe(false);
    expect(ticketAssigneeSchema.safeParse("not a user!").success).toBe(false);
  });
});
