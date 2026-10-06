import { z } from "zod";

import { emailSchema, userSchema } from "./schema";

// Real-auth input contracts (Better Auth, Phase 5): shared by the logon and
// registration forms and the server actions, so client and server validate
// the same shape. Client-safe (no node APIs): error mapping lives in
// auth-errors.ts (server-only), unit-tested without env or DB.
// One magic, one place: the form, the server action and the Better Auth options
// (src/auth.ts) share both bounds.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const signUpSchema = z.object({
  user: userSchema,
  email: emailSchema,
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

export const signInSchema = z.object({
  // The logon names the account by handle or by mailbox; the username plugin
  // accepts either in the email field of sign-in.
  user: z.union([userSchema, emailSchema]),
  password: z.string().min(1),
});

export type SessionActionError = "invalid" | "taken" | "email-taken" | "unavailable";

export type SessionActionResult =
  { ok: true; user: string } | { ok: false; error: SessionActionError };

// Logon can only fail on wrong credentials or a backend outage — registration
// owns the taken-handle and taken-mailbox vocabulary, so the sign-in contract
// excludes it and the form carries no dead branch.
export type SignInError = Extract<SessionActionError, "invalid" | "unavailable">;

export type SignInResult = { ok: true; user: string } | { ok: false; error: SignInError };

// The SSO providers the shell knows (Google, GitHub): one vocabulary for the
// logon/registration buttons, the auth wiring and the seeded-e2e fake IdP.
// Client-safe (no node APIs).
export const socialProviders = ["google", "github"] as const;

export type SocialProvider = (typeof socialProviders)[number];
