// Unit-test bootstrap: server modules (src/db, src/auth) validate the
// environment at import, but Vitest never loads the slot's .env. Provide
// hermetic fallbacks so collection never depends on a developer's .env —
// real variables win when set. No test may rely on these values to reach a
// database: suites that exercise queries stub @/db instead.
process.env.DATABASE_URL ??= "postgres://swearjar-unit:swearjar-unit@localhost:5432/swearjar_unit";
process.env.BETTER_AUTH_SECRET ??= "unit-test-secret-fallback-32-chars!";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000/";
