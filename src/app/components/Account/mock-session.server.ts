import { cookies } from "next/headers";
import {
  MOCK_SESSION_COOKIE,
  mockSessionEnabled,
  parseMockSession,
  type MockSession,
} from "./mock-session";

// Server-only reader: the mock session is a plain cookie, read per request.
export async function getMockSession(): Promise<MockSession | null> {
  if (!mockSessionEnabled()) return null;
  const store = await cookies();
  return parseMockSession(store.get(MOCK_SESSION_COOKIE)?.value);
}
