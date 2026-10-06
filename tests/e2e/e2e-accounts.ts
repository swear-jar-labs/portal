import { e2eAccountEmail } from "../../src/lib/e2e-oauth";

// The seeded e2e run owns one database (see E2E_DATABASE_URL): the global
// setup recreates its schema, migrates and seeds these fixture accounts, and
// every spec signs in against them with real Better Auth sessions. Specs that
// need a fresh participant register a timestamped handle through the logon
// helper — fixed handles below are the only rows the seed creates.
export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

// The single password every seeded fixture account shares: specs register
// timestamped handles with it (via the logon helper) and type it into the
// logon form for fixed handles. Long enough for the form contract, short of
// the Better Auth ceiling.
export const E2E_PASSWORD = "e2e-quinn-secret-00";

export const E2E_FIXTURE_HANDLES = [
  "ada",
  "grace",
  "ken",
  "lin",
  "admin",
  "coadmin",
  "demo-candidate",
  "demo-second",
] as const;

// The mailbox the seed and the logon helper derive for a handle: the same
// convention the fake OAuth profiles vouch for, so password and social
// sign-ins land on one row.
export function e2eMailboxFor(handle: string): string {
  return handle.includes("@") ? handle : e2eAccountEmail(handle);
}

// Which database URL the run uses: an explicit E2E_DATABASE_URL wins (the
// global setup then never touches Docker); otherwise the local compose
// default, which the harness starts and stops around the run.
const E2E_DATABASE_DEFAULT_URL = "postgres://swearjar:swearjar@localhost:5433/swearjar_e2e";

export function resolveE2eDatabaseUrl(): string {
  const override = process.env.E2E_DATABASE_URL?.trim();
  return override ? override : E2E_DATABASE_DEFAULT_URL;
}
