import { describe, expect, it } from "vitest";
import {
  applyMentionCompletion,
  matchMentionCandidates,
  MAX_MENTION_SUGGESTIONS,
  mentionQueryBeforeCaret,
} from "@/shared/MarkdownEditor/mentionComplete";

const IDENTITIES = {
  ada: { username: "Ada" },
  grace: { username: "grace_h" },
  admin: { username: "admin" },
};

describe("mentionQueryBeforeCaret", () => {
  it("finds the query ending at the caret", () => {
    expect(mentionQueryBeforeCaret("hi @ad", 6)).toEqual({ start: 3, query: "ad" });
  });

  it("returns null outside a mention", () => {
    expect(mentionQueryBeforeCaret("hi ada", 6)).toBeNull();
    expect(mentionQueryBeforeCaret("hi @ad", 3)).toBeNull();
  });

  it("rejects emails and doubled ats", () => {
    expect(mentionQueryBeforeCaret("mail ada@x", 11)).toBeNull();
    expect(mentionQueryBeforeCaret("hi @@ad", 7)).toBeNull();
  });

  it("accepts an empty query right after the at", () => {
    expect(mentionQueryBeforeCaret("hi @", 4)).toEqual({ start: 3, query: "" });
  });
});

describe("matchMentionCandidates", () => {
  it("matches user keys and usernames by prefix", () => {
    expect(matchMentionCandidates("a", IDENTITIES).map((entry) => entry.user)).toEqual([
      "ada",
      "admin",
    ]);
    expect(matchMentionCandidates("grace_", IDENTITIES).map((entry) => entry.user)).toEqual([
      "grace",
    ]);
  });

  it("returns an empty list without matches", () => {
    expect(matchMentionCandidates("zzz", IDENTITIES)).toEqual([]);
  });

  it("caps the list", () => {
    const many = Object.fromEntries(
      Array.from({ length: MAX_MENTION_SUGGESTIONS + 3 }, (_, index) => [
        `user${index}`,
        { username: `user${index}` },
      ]),
    );
    expect(matchMentionCandidates("", many)).toHaveLength(MAX_MENTION_SUGGESTIONS);
  });
});

describe("applyMentionCompletion", () => {
  it("splices the canonical handle with a trailing space", () => {
    expect(applyMentionCompletion("hi @ad!", { start: 3, query: "ad" }, 6, "ada")).toEqual({
      value: "hi @ada !",
      caret: 8,
    });
  });
});
