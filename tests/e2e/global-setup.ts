import { execFileSync } from "node:child_process";
import "dotenv/config";

import { resolveE2eDatabaseUrl } from "./e2e-accounts";
import { recreateE2eSchema, seedE2eAccounts } from "./seed";

// The compose service behind the default run. The harness starts it when it
// is down and stops it afterwards only if it started it: a developer who
// keeps db-e2e running for their own psql sessions keeps it. An explicit
// E2E_DATABASE_URL (CI service, long-running instance) disables this
// management entirely — that database is not ours to stop.
const E2E_DB_SERVICE = "db-e2e";

function isE2eDbRunning(): boolean {
  const ids = execFileSync("docker", ["compose", "ps", "-q", E2E_DB_SERVICE], { encoding: "utf8" });
  return ids.trim().length > 0;
}

function startE2eDb(): void {
  execFileSync("docker", ["compose", "up", "-d", "--wait", E2E_DB_SERVICE], { stdio: "inherit" });
}

function stopE2eDb(): void {
  try {
    execFileSync("docker", ["compose", "stop", E2E_DB_SERVICE], { stdio: "inherit" });
  } catch (error) {
    // Best effort: a failed stop must never turn a finished run red on its own.
    console.warn(`[e2e] could not stop ${E2E_DB_SERVICE}: ${String(error).slice(0, 200)}`);
  }
}

// The e2e prelude (Playwright globalSetup; the dev server starts before it,
// but Next connects to Postgres lazily, so the database is ready before the
// first test): start the local compose database when it is down, recreate its
// schema, migrate the baseline onto it and seed the fixture accounts.
// Isolation between spec files is by unique data — timestamped handles for
// fresh participants, read-only fixed handles for members — so no truncate
// runs between files; four workers share one database the way four users
// would. The returned teardown runs even when tests fail and stops the
// compose service only when this run started it.
export default async function globalSetup(): Promise<(() => Promise<void>) | void> {
  const e2eUrl = resolveE2eDatabaseUrl();
  const devUrl = process.env.DATABASE_URL;
  // The one footgun this file exists to prevent: recreating the schema under
  // a URL that is also the development database. Refuse instead of wiping.
  if (devUrl !== undefined && devUrl === e2eUrl) {
    throw new Error(
      `Refusing to seed: E2E_DATABASE_URL (${e2eUrl}) matches DATABASE_URL. ` +
        `Point the e2e run at a database of its own (name it *_e2e).`,
    );
  }
  const managed = !process.env.E2E_DATABASE_URL?.trim();
  let startedByUs = false;
  if (managed) {
    startedByUs = !isE2eDbRunning();
    try {
      if (startedByUs) startE2eDb();
    } catch (error) {
      if (startedByUs) stopE2eDb();
      throw new Error(
        `Cannot manage the e2e database container — start Docker, or set ` +
          `E2E_DATABASE_URL to use an external database. Cause: ${String(error).slice(0, 200)}`,
        { cause: error },
      );
    }
  }
  try {
    await recreateE2eSchema(e2eUrl);
    execFileSync("npx", ["drizzle-kit", "migrate"], {
      env: { ...process.env, DATABASE_URL: e2eUrl },
      stdio: "inherit",
    });
    await seedE2eAccounts(e2eUrl);
  } catch (error) {
    if (startedByUs) stopE2eDb();
    throw new Error(
      managed
        ? `Cannot seed the e2e database at ${e2eUrl} — check ` +
            `"docker compose logs ${E2E_DB_SERVICE}". Cause: ${String(error).slice(0, 200)}`
        : `Cannot seed the external e2e database at ${e2eUrl} (E2E_DATABASE_URL). ` +
            `Cause: ${String(error).slice(0, 200)}`,
      { cause: error },
    );
  }
  if (startedByUs) {
    return async () => {
      stopE2eDb();
    };
  }
}
