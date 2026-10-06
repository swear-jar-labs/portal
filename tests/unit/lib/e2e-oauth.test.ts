import { afterEach, describe, expect, it, vi } from "vitest";

import {
  e2eAccountEmail,
  e2eOAuthProfile,
  isE2eFakeOAuthProvider,
  isE2eOAuthEnabled,
  mintE2eOAuthCode,
  readE2eOAuthCode,
} from "@/lib/e2e-oauth";

const SECRET = "e2e-unit-secret-please-change-me-32ch";
const OTHER_SECRET = "another-unit-secret-please-change1";

describe("e2e fake OAuth codes", () => {
  it("round-trips the provider through mint and read", () => {
    const code = mintE2eOAuthCode("google", SECRET, 1_000);
    expect(readE2eOAuthCode(code, SECRET, 2_000)).toBe("google");
  });

  it("rejects a code signed with another secret", () => {
    const code = mintE2eOAuthCode("github", SECRET, 1_000);
    expect(readE2eOAuthCode(code, OTHER_SECRET, 2_000)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const [payload, signature] = mintE2eOAuthCode("google", SECRET, 1_000).split(".");
    const tampered = `${payload}X.${signature}`;
    expect(readE2eOAuthCode(tampered, SECRET, 2_000)).toBeNull();
  });

  it("rejects an expired code", () => {
    const code = mintE2eOAuthCode("google", SECRET, 1_000);
    expect(readE2eOAuthCode(code, SECRET, 1_000 + 10 * 60 * 1000 + 1)).toBeNull();
  });

  it("rejects malformed codes", () => {
    expect(readE2eOAuthCode("", SECRET)).toBeNull();
    expect(readE2eOAuthCode("no-separator", SECRET)).toBeNull();
    expect(readE2eOAuthCode("!!!.???", SECRET)).toBeNull();
  });
});

describe("e2e OAuth route gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is closed without the flag", () => {
    expect(isE2eOAuthEnabled()).toBe(false);
  });

  it("opens with SWEARJAR_E2E=1", () => {
    vi.stubEnv("SWEARJAR_E2E", "1");
    expect(isE2eOAuthEnabled()).toBe(true);
  });
});

describe("e2e fake OAuth provider table", () => {
  it("knows google and github only", () => {
    expect(isE2eFakeOAuthProvider("google")).toBe(true);
    expect(isE2eFakeOAuthProvider("github")).toBe(true);
    expect(isE2eFakeOAuthProvider("discord")).toBe(false);
  });

  it("vouches for the seeded fixture mailbox with a verified email", () => {
    const profile = e2eOAuthProfile("google");
    expect(profile.email).toBe(e2eAccountEmail("ada"));
    expect(profile.email_verified).toBe(true);
    expect(profile.sub).toBe(profile.id);
  });

  it("shares the mailbox convention with the seed and the logon helper", () => {
    expect(e2eAccountEmail("ada")).toBe("ada@example.com");
    expect(e2eAccountEmail("quinn-abc")).toBe("quinn-abc@example.com");
  });
});
