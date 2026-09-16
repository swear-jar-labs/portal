import { z } from "zod";
import { USER_PATTERN, userSchema } from "./schema";

// Mock session until Better Auth lands (Phase 5, see TECH.md): the cookie
// carries the user, nothing is signed. Presentation only — never a security
// boundary; disabled outside development/test. This module goes away with auth.

export const MOCK_SESSION_COOKIE = "sj_mock_session";
export const MOCK_SESSION_MAX_AGE_S = 60 * 60 * 24 * 7;

export type MockSession = {
  user: string;
};

export const mockLogonSchema = z.object({
  user: userSchema,
  password: z.string().min(1),
});

export type MockLogonInput = z.infer<typeof mockLogonSchema>;

// Provider logon is mocked as well: each provider lands on its own demo user
// until Better Auth maps real accounts (Phase 5).
export const socialProviders = ["google", "github"] as const;
export type SocialProvider = (typeof socialProviders)[number];

export const socialProviderUsers = {
  google: "ada",
  github: "grace",
} as const satisfies Record<SocialProvider, string>;

export const mockSocialLogonSchema = z.object({
  provider: z.enum(socialProviders),
});

export type MockSocialLogonInput = z.infer<typeof mockSocialLogonSchema>;

export function parseMockSession(value: string | undefined): MockSession | null {
  if (!value) return null;
  const user = value.trim();
  if (!USER_PATTERN.test(user)) return null;
  return { user };
}

export function mockSessionEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}
