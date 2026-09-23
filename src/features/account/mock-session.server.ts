import { cookies } from "next/headers";
import type { Actor } from "./actor";
import { resolveAccount } from "./mock-accounts";
import {
  MOCK_SESSION_COOKIE,
  mockSessionEnabled,
  parseMockSession,
  type MockSession,
} from "./mock-session";

// Server-only reader: the mock session is a plain cookie, read per request.
async function getMockSession(): Promise<MockSession | null> {
  if (!mockSessionEnabled()) return null;
  const store = await cookies();
  return parseMockSession(store.get(MOCK_SESSION_COOKIE)?.value);
}

// The actor the shell and the pages render with: the cookie carries the
// handle only, the level resolves from the mock registry (single point).
export async function getActorSession(): Promise<Actor | null> {
  const session = await getMockSession();
  if (!session) return null;
  return resolveAccount(session.user);
}
