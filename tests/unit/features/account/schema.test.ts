import { describe, expect, it } from "vitest";
import { applySchema } from "@/features/account/schema";

const VALID = {
  role: "reviewer",
  user: "Grace-Hopper",
  email: "grace@example.com",
  experience: "",
  weeklyHours: "over-10",
  motivation: "A compiler is a conversation.",
} as const;

describe("applySchema", () => {
  it("normalizes the user to lower case", () => {
    const parsed = applySchema.parse(VALID);
    expect(parsed.user).toBe("grace-hopper");
  });

  it("rejects users with spaces or too short", () => {
    expect(applySchema.safeParse({ ...VALID, user: "Grace Hopper" }).success).toBe(false);
    expect(applySchema.safeParse({ ...VALID, user: "g" }).success).toBe(false);
  });

  it("rejects a broken email", () => {
    expect(applySchema.safeParse({ ...VALID, email: "grace" }).success).toBe(false);
  });

  it("requires a motivation", () => {
    expect(applySchema.safeParse({ ...VALID, motivation: "   " }).success).toBe(false);
  });

  it("keeps experience optional", () => {
    expect(applySchema.safeParse({ ...VALID, experience: "" }).success).toBe(true);
  });
});
