// The fixtures switch every mock slice shares: fixture stores, seeds and demo
// actions stay off in production. It gates data, never the session. Client-safe
// (no node APIs), so both server modules and client-safe helpers can read it.
export function fixturesEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

// The seeded end-to-end run (Playwright sets SWEARJAR_E2E=1): the suite talks
// to a real PostgreSQL (see E2E_DATABASE_URL) through real Better Auth
// sessions, with loopback stand-ins behind the OAuth provider ids. The flag
// marks the run (next.config isolates the build output) and gates the e2e-only
// pieces (fake OAuth wiring, e2e API routes, test seed) — there is no mock
// session branch anymore.
export function isSeededE2e(): boolean {
  return process.env.SWEARJAR_E2E === "1";
}
