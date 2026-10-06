"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/auth";
import { authErrorCode, mapSignInError, mapSignUpError } from "../model/auth-errors";
import {
  signInSchema,
  signUpSchema,
  type SessionActionResult,
  type SignInResult,
} from "../model/credentials";

// Real session actions (Better Auth): the forms talk to the database through
// these server actions in every mode, including the seeded e2e run — there is
// no second logon path anymore (see tasks/backend-e2e-auth).
export async function signUp(input: unknown): Promise<SessionActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: parsed.data.user,
        username: parsed.data.user,
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: await headers(),
    });
    revalidatePath("/", "layout");
    return { ok: true, user: result.user.username ?? parsed.data.user };
  } catch (error) {
    // Unexpected auth failures are a server-side fact: log the code, never the payload.
    console.error(
      "[auth] sign-up failed",
      authErrorCode(error) ?? "unknown",
      String(error).slice(0, 200),
    );
    return { ok: false, error: mapSignUpError(error) };
  }
}

export async function signIn(input: unknown): Promise<SignInResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    // Better Auth signs in by mailbox; the username plugin adds the handle
    // route. The form accepts either, so pick the matching endpoint.
    const byHandle = !parsed.data.user.includes("@");
    const result = byHandle
      ? await auth.api.signInUsername({
          body: { username: parsed.data.user, password: parsed.data.password },
          headers: await headers(),
        })
      : await auth.api.signInEmail({
          body: { email: parsed.data.user, password: parsed.data.password },
          headers: await headers(),
        });
    revalidatePath("/", "layout");
    return { ok: true, user: result.user.username ?? parsed.data.user };
  } catch (error) {
    // Unexpected auth failures are a server-side fact: log the code, never the payload.
    console.error(
      "[auth] sign-in failed",
      authErrorCode(error) ?? "unknown",
      String(error).slice(0, 200),
    );
    return { ok: false, error: mapSignInError(error) };
  }
}

export async function logoff(): Promise<void> {
  try {
    // On a database outage Better Auth logs the failure and still clears its
    // cookies (its sign-out swallows the read/delete errors) — verified with
    // the database stopped: the click lands home and the browser stays out.
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // Belt and braces: logoff is the one action that must never trap a person
    // in a session.
  }
  revalidatePath("/", "layout");
}
