import { isAPIError } from "better-auth/api";

import type { SessionActionError, SignInError } from "./credentials";

// Server-only (better-auth/api pulls node:crypto — never import this from
// client components): Better Auth failures translated to form terms.
// Unit-tested in node without env or DB.
export function authErrorCode(error: unknown): string | null {
  if (!isAPIError(error)) return null;
  const body = error.body;
  if (typeof body !== "object" || body === null || !("code" in body)) return null;
  return typeof body.code === "string" ? body.code : null;
}

const EMAIL_TAKEN_CODES = new Set(["USER_ALREADY_EXISTS", "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"]);

// Registration failures speak in form terms: taken handle, taken mailbox,
// anything else the user typed wrong, and transport/DB outages.
export function mapSignUpError(error: unknown): SessionActionError {
  const code = authErrorCode(error);
  if (code === null) return "unavailable";
  if (code === "USERNAME_IS_ALREADY_TAKEN") return "taken";
  if (EMAIL_TAKEN_CODES.has(code)) return "email-taken";
  return "invalid";
}

// Logon knows only wrong credentials vs the backend being down: every other
// failure (an unverified mailbox, a policy refusal) reads the same to the user.
export function mapSignInError(error: unknown): SignInError {
  const code = authErrorCode(error);
  return code === null ? "unavailable" : "invalid";
}
