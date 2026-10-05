// The fixtures switch every mock slice shares: fixture stores, seeds and demo
// actions stay off in production. It gates data, never the session — the mock
// session is its own, narrower mode (isSeededE2e). Client-safe (no node APIs),
// so both server modules and client-safe helpers can read it.
export function fixturesEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

// The seeded end-to-end run (Playwright sets SWEARJAR_E2E=1): the suite never
// talks to PostgreSQL, so both session readers must pick their mock branch
// before any Better Auth call — a connection attempt would make the run depend
// on a local database that is not part of the test setup.
export function isSeededE2e(): boolean {
  return process.env.SWEARJAR_E2E === "1";
}
