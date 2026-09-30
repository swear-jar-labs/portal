import { describe, expect, it } from "vitest";
import {
  buildMentionDirectory,
  extractMentionHandles,
  mentionEventId,
  mentionRecipients,
  resolveMentionHandles,
  stripMentionCode,
} from "@/shared/mentions";

const DIRECTORY = buildMentionDirectory({
  ada: { username: "Ada" },
  grace: { username: "grace_h" },
});

describe("extractMentionHandles", () => {
  it("collects handles lower-cased and deduped in order", () => {
    expect(extractMentionHandles("hi @Ada and @grace_h, ping @ada!")).toEqual(["ada", "grace_h"]);
  });

  it("ignores emails, doubled ats and dotted paths", () => {
    expect(extractMentionHandles("mail ada@x.io or @@ada or v1.@ada")).toEqual([]);
  });

  it("matches after punctuation and at the text start", () => {
    expect(extractMentionHandles("@ada: (@grace_h?)")).toEqual(["ada", "grace_h"]);
  });

  it("rejects handles outside the account canon", () => {
    expect(extractMentionHandles("@a @this-handle-is-far-too-long-for-accounts")).toEqual([]);
  });
});

describe("stripMentionCode", () => {
  it("removes fenced blocks and inline spans", () => {
    expect(
      extractMentionHandles(stripMentionCode("`@ada` and\n```\n@ada\n```\nreal @grace_h")),
    ).toEqual(["grace_h"]);
  });
});

describe("resolveMentionHandles", () => {
  it("resolves users and usernames, drops unknown", () => {
    expect(resolveMentionHandles(["ada", "grace_h", "nobody"], DIRECTORY)).toEqual([
      "ada",
      "grace",
    ]);
  });
});

describe("mentionRecipients", () => {
  it("excludes the author and code segments", () => {
    expect(
      mentionRecipients({
        body: "hi @grace_h and me @ada `and @ada`",
        authorUser: "ada",
        directory: DIRECTORY,
      }),
    ).toEqual(["grace"]);
  });
});

describe("mentionEventId", () => {
  it("is stable per message and recipient", () => {
    expect(mentionEventId("post-1", "ada")).toBe(mentionEventId("post-1", "ada"));
    expect(mentionEventId("post-1", "ada")).not.toBe(mentionEventId("post-1", "grace"));
    expect(mentionEventId("post-1", "ada")).not.toBe(mentionEventId("post-2", "ada"));
  });
});
