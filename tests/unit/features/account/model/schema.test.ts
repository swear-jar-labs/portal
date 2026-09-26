import { describe, expect, it } from "vitest";
import { applySchema } from "@/features/account/model/schema";

const VALID = {
  experience: "",
  weeklyHours: "over-10",
  motivation: "A compiler is a conversation.",
} as const;

describe("applySchema", () => {
  it("accepts an application without identity fields", () => {
    expect(applySchema.parse(VALID)).toEqual(VALID);
  });

  it("requires a motivation", () => {
    expect(applySchema.safeParse({ ...VALID, motivation: "   " }).success).toBe(false);
  });

  it("keeps experience optional", () => {
    expect(applySchema.safeParse({ ...VALID, experience: "" }).success).toBe(true);
  });
});
