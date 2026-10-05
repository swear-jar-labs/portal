import { headers } from "next/headers";
import { cache } from "react";

import { auth } from "@/auth";
import { isSeededE2e } from "@/shared/mock";
import type { Actor } from "../model/actor";
import { ensureAccount, resolveAccount } from "./account-registry";
import { getMockActorSession } from "./mock-session.server";

// The session bridge: the UI prop-model (Actor) is unchanged, only the source
// flips. The seeded e2e run reads the mock cookie; everywhere else the source
// is Better Auth — a database outage renders as a guest, never as a silent
// mock. First contact through real auth provisions a Participant, mirroring
// the mock first-contact rule — until backend-account moves levels into DB
// columns.
//
// Database load: layout and pages ask for the actor several times per request,
// so the read is memoized per render (react cache), and Better Auth keeps the
// session in a signed cookie (see src/auth.ts) — the common render verifies a
// signature and never queries Postgres. The database is touched on the first
// render after sign-in and every SESSION_CACHE_MAX_AGE_S afterwards.

async function readBetterAuthActor(): Promise<Actor | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const username = session?.user.username ?? null;
    if (!username) {
      // A session without a handle means an account row the create hook never
      // stamped (see src/auth.ts): signed in for Better Auth, a guest here.
      if (session) console.warn("[auth] session without a username", session.user.id);
      return null;
    }
    return resolveAccount(username) ?? ensureAccount(username);
  } catch (error) {
    // Unreachable or stalled database: render as a guest instead of failing the
    // page. The driver bounds the wait (see src/db/index.ts), so this only
    // catches real errors, never a slow-but-healthy query.
    console.warn("[auth] session read failed", String(error).slice(0, 200));
    return null;
  }
}

export const getActorSession = cache(async (): Promise<Actor | null> => {
  if (isSeededE2e()) return getMockActorSession();
  return readBetterAuthActor();
});
