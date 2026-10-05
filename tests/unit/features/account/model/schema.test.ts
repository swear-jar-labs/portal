import { describe, expect, it } from "vitest";
import { applySchema, isUserHandle, userSchema } from "@/features/account/model/schema";

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

describe("handle canon", () => {
  it("saves handle input lower case", () => {
    const parsed = userSchema.parse("Quinn_7");
    expect(parsed).toBe("quinn_7");
  });

  it("takes any case at the plugin boundary: storage normalizes it", () => {
    // The Better Auth username plugin validates the raw value on sign-in (the
    // lookup itself lower-cases), so the predicate must accept "Ada" too.
    expect(isUserHandle("Ada")).toBe(true);
    expect(isUserHandle("quinn_7")).toBe(true);
    expect(isUserHandle("ada-1")).toBe(true);
  });

  it("refuses handles outside the pattern and the length bounds", () => {
    expect(isUserHandle("a")).toBe(false);
    expect(isUserHandle("a".repeat(33))).toBe(false);
    expect(isUserHandle("ada space")).toBe(false);
    expect(isUserHandle("ada@lab.io")).toBe(false);
  });
});
