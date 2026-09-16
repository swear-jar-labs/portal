import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mockLogonSchema,
  mockSessionEnabled,
  mockSocialLogonSchema,
  parseMockSession,
  socialProviderUsers,
  socialProviders,
} from "@/features/account/mock-session";
import { USER_PATTERN } from "@/features/account/schema";

describe("parseMockSession", () => {
  it("accepts a lowercase user", () => {
    expect(parseMockSession("ada-lovelace")).toEqual({ user: "ada-lovelace" });
  });

  it("trims surrounding whitespace", () => {
    expect(parseMockSession("  ada  ")).toEqual({ user: "ada" });
  });

  it("rejects missing, empty and malformed values", () => {
    expect(parseMockSession(undefined)).toBeNull();
    expect(parseMockSession("")).toBeNull();
    expect(parseMockSession("   ")).toBeNull();
    expect(parseMockSession("Ada Lovelace")).toBeNull();
    expect(parseMockSession("a")).toBeNull();
    expect(parseMockSession("x".repeat(33))).toBeNull();
    expect(parseMockSession("ADMIN")).toBeNull();
  });
});

describe("mockLogonSchema", () => {
  it("lowercases the user and keeps the password", () => {
    const parsed = mockLogonSchema.safeParse({ user: "  Ada-1 ", password: "open sesami" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({ user: "ada-1", password: "open sesami" });
    }
  });

  it("rejects an empty password", () => {
    expect(mockLogonSchema.safeParse({ user: "ada", password: "" }).success).toBe(false);
  });

  it("rejects users with invalid characters", () => {
    expect(mockLogonSchema.safeParse({ user: "ada!", password: "secret" }).success).toBe(false);
  });
});

describe("mockSocialLogonSchema", () => {
  it("accepts every known provider", () => {
    for (const provider of socialProviders) {
      expect(mockSocialLogonSchema.safeParse({ provider }).success, provider).toBe(true);
    }
  });

  it("rejects unknown providers", () => {
    expect(mockSocialLogonSchema.safeParse({ provider: "gitlab" }).success).toBe(false);
    expect(mockSocialLogonSchema.safeParse({}).success).toBe(false);
  });

  it("keeps a valid demo user for every provider", () => {
    for (const provider of socialProviders) {
      const user = socialProviderUsers[provider];
      expect(user, provider).toBeDefined();
      expect(USER_PATTERN.test(user), provider).toBe(true);
    }
  });

  it("keeps the demo users distinct so providers stay observable", () => {
    const users = socialProviders.map((provider) => socialProviderUsers[provider]);
    expect(new Set(users).size).toBe(users.length);
  });
});

describe("mockSessionEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is on outside production", () => {
    expect(mockSessionEnabled()).toBe(true);
  });

  it("is off in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(mockSessionEnabled()).toBe(false);
  });
});
