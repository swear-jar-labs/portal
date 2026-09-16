import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DOS_ROLE_ATTR } from "../../attributes";
import { textRoles } from "../../components/tone";

const tokens = readFileSync(new URL("../../tokens.css", import.meta.url), "utf8");

describe("typography roles", () => {
  it("has a role table entry in tokens.css for every role", () => {
    const pattern = new RegExp(`\\[${DOS_ROLE_ATTR}="([a-z]+)"\\]`, "g");
    const declared = [...tokens.matchAll(pattern)].map((match) => match[1]);
    expect(declared.sort()).toEqual([...textRoles].sort());
  });
});
