import { cookies } from "next/headers";
import { isSeededE2e } from "@/shared/mock";
import type { Actor } from "../model/actor";
import { resolveAccount } from "./account-registry";
import { MOCK_SESSION_COOKIE, parseMockSession, type MockSession } from "./mock-session";

// Server-only reader: the mock session is a plain cookie, read per request.
// The mock branch serves one caller — the seeded e2e run.
async function getMockSession(): Promise<MockSession | null> {
  if (!isSeededE2e()) return null;
  const store = await cookies();
  return parseMockSession(store.get(MOCK_SESSION_COOKIE)?.value);
}

// The mock branch of the session bridge (see auth-session.server.ts):
// the cookie carries the handle only, the level resolves from the mock
// registry (single point).
export async function getMockActorSession(): Promise<Actor | null> {
  const session = await getMockSession();
  if (!session) return null;
  return resolveAccount(session.user);
}
