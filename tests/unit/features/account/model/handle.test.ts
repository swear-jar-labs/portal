import { describe, expect, it } from "vitest";

import {
  handleBaseFromEmail,
  handleCandidates,
  pickFreeHandle,
  sanitizeHandle,
} from "@/features/account/model/handle";
import { isUserHandle, USER_MAX_LENGTH } from "@/features/account/model/schema";

describe("handle generation for accounts created without one", () => {
  it("builds the base from the mailbox local part", () => {
    expect(handleBaseFromEmail("ada@lab.io")).toBe("ada");
    expect(handleBaseFromEmail("ada.smith+news@lab.io")).toBe("ada-smith-news");
    expect(handleBaseFromEmail("Quinn_7@lab.io")).toBe("quinn_7");
  });

  it("falls back when the local part cannot name a handle", () => {
    expect(handleBaseFromEmail("a@lab.io")).toBe("user");
    expect(handleBaseFromEmail("@lab.io")).toBe("user");
    expect(handleBaseFromEmail("***@lab.io")).toBe("user");
  });

  it("strips what the canon does not allow and trims the edges", () => {
    expect(sanitizeHandle("Ada Lovelace!")).toBe("ada-lovelace");
    expect(sanitizeHandle("__ada__")).toBe("ada");
    expect(sanitizeHandle("...")).toBe("");
  });

  it("offers the bare base first, then numbered candidates", () => {
    expect(handleCandidates("ada").slice(0, 3)).toEqual(["ada", "ada-2", "ada-3"]);
  });

  it("keeps every candidate inside the canon", () => {
    const base = handleBaseFromEmail(`${"q".repeat(40)}@lab.io`);
    for (const candidate of handleCandidates(base)) {
      expect(candidate.length).toBeLessThanOrEqual(USER_MAX_LENGTH);
      expect(isUserHandle(candidate), candidate).toBe(true);
    }
  });

  it("takes the first free candidate and never a taken one", async () => {
    const taken = new Set(["ada", "ada-2"]);
    const picked = await pickFreeHandle("ada", async (candidate) => taken.has(candidate));
    expect(picked).toBe("ada-3");
  });

  it("gives up instead of inventing a handle when every candidate is taken", async () => {
    const picked = await pickFreeHandle("ada", async () => true);
    expect(picked).toBeNull();
  });
});
