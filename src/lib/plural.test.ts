import { describe, expect, it } from "vitest";
import { plural } from "./plural";

const coin = { one: "COIN", other: "COINS" };

describe("plural", () => {
  it("picks the singular form for one", () => {
    expect(plural(1, coin)).toBe("COIN");
  });

  it("picks the plural form for zero and many", () => {
    expect(plural(0, coin)).toBe("COINS");
    expect(plural(2, coin)).toBe("COINS");
  });

  it("falls back to other when the locale category has no form", () => {
    // Russian selects the "few" category for 2, which this form set does not define.
    expect(plural(2, coin, "ru")).toBe("COINS");
  });

  it("uses the locale category when it is defined", () => {
    expect(plural(2, { one: "яблоко", few: "яблока", other: "яблок" }, "ru")).toBe("яблока");
  });
});
