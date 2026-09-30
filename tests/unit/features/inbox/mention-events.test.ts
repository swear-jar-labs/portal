import { describe, expect, it } from "vitest";
import {
  buildMentionEvents,
  mentionExcerpt,
  mentionRedactedBody,
  mentionSubject,
} from "@/features/inbox/mention-events";
import { buildMentionDirectory } from "@/shared/mentions";

const DIRECTORY = buildMentionDirectory({ ada: { username: "Ada" }, grace: { username: "Grace" } });
const TARGET = { kind: "thread", label: "read-first", href: "/forum/read-first" } as const;

describe("mentionExcerpt", () => {
  it("folds whitespace and strips code", () => {
    expect(mentionExcerpt("hi  @ada\n`code @grace`\nnew line")).toBe("hi @ada new line");
  });

  it("truncates long bodies with an ellipsis", () => {
    const excerpt = mentionExcerpt(`@ada ${"x".repeat(300)}`);
    expect(excerpt.length).toBeLessThanOrEqual(160);
    expect(excerpt).toMatch(/…$/);
  });
});

describe("mentionSubject", () => {
  it("names the mentioner and the context", () => {
    expect(mentionSubject("Ada", "read-first")).toBe("Ada mentioned you in read-first");
  });
});

describe("mentionRedactedBody", () => {
  it("carries no message text", () => {
    expect(mentionRedactedBody("Ada")).toBe(
      "Ada mentioned you. Open the message to read the context.",
    );
  });
});

describe("buildMentionEvents", () => {
  const base = {
    messageId: "post-1",
    source: "FORUM",
    mentioner: "Grace",
    context: "read-first",
    target: TARGET,
    at: "2026-09-29T00:00:00.000Z",
  };

  it("delivers one mention event per recipient except the author", () => {
    const deliveries = buildMentionEvents({
      ...base,
      body: "hi @ada and @grace, see this",
      authorUser: "grace",
      directory: DIRECTORY,
    });
    expect(deliveries.map((delivery) => delivery.user)).toEqual(["ada"]);
    expect(deliveries[0]?.event).toMatchObject({
      id: "mention:post-1:ada",
      kind: "mention",
      source: "FORUM",
      subject: "Grace mentioned you in read-first",
      body: "hi @ada and @grace, see this",
      target: TARGET,
    });
  });

  it("keeps an explicit excerpt out of the redacted path", () => {
    const deliveries = buildMentionEvents({
      ...base,
      body: "secret note @ada",
      authorUser: "grace",
      directory: DIRECTORY,
      excerpt: mentionRedactedBody("Grace"),
    });
    expect(deliveries[0]?.event.body).toBe(
      "Grace mentioned you. Open the message to read the context.",
    );
  });

  it("notifies nobody without resolved handles", () => {
    expect(
      buildMentionEvents({
        ...base,
        body: "hi @nobody",
        authorUser: "grace",
        directory: DIRECTORY,
      }),
    ).toEqual([]);
  });
});
