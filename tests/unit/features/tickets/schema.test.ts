import { describe, expect, it } from "vitest";
import { USER_PATTERN } from "@/features/account/schema";
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

  it("keeps the assignee canon in step with the account's USER_PATTERN", () => {
    // The tickets' schema mirrors the account canon (a cross-feature import
    // would break the slice graph), so this test pins the two together: any
    // name it accepts is a canonical user, and the known names pass.
    for (const user of ["ada", "grace", "ken-2", "a_b", "x9"]) {
      expect(USER_PATTERN.test(user), user).toBe(true);
      const parsed = ticketAssigneeSchema.safeParse(user);
      expect(parsed.success, user).toBe(true);
      expect(parsed.success ? parsed.data : "").toMatch(USER_PATTERN);
    }
    for (const bad of ["x", "not a user!", "a".repeat(33)]) {
      expect(USER_PATTERN.test(bad), bad).toBe(false);
      expect(ticketAssigneeSchema.safeParse(bad).success, bad).toBe(false);
    }
  });
});
