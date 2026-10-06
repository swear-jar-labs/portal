import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { account, user } from "../../src/db/schema";
import { E2E_FIXTURE_HANDLES, E2E_PASSWORD, e2eMailboxFor } from "./e2e-accounts";

// The credential-account marker Better Auth writes on email sign-up
// (see sign-up/email in better-auth): the seed mirrors it, so the seeded rows
// behave exactly like registered ones.
const CREDENTIAL_PROVIDER_ID = "credential";

// A seeded run starts from an empty database: drop everything the previous
// run left behind, then drizzle-kit migrates the baseline on top. The
// migration journal lives in its own `drizzle` schema outside public —
// dropping public alone would leave the journal behind and the next migrate
// would (incorrectly) report success on an empty database.
export async function recreateE2eSchema(databaseUrl: string): Promise<void> {
  const client = postgres(databaseUrl, { max: 1 });
  try {
    // IF EXISTS on both: a fresh volume has public but no journal schema yet,
    // and a database left public-less by an interrupted run must still recover.
    await client`DROP SCHEMA IF EXISTS public CASCADE`;
    await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    await client`CREATE SCHEMA public`;
  } finally {
    await client.end();
  }
}

// Fixture accounts (password sign-in): one row per roster handle with the
// shared e2e password, idempotent — reruns and parallel workers share the
// database, so existing mailboxes are skipped, never duplicated.
export async function seedE2eAccounts(databaseUrl: string): Promise<void> {
  const client = postgres(databaseUrl, { max: 1 });
  try {
    const db = drizzle(client);
    const password = await hashPassword(E2E_PASSWORD);
    for (const handle of E2E_FIXTURE_HANDLES) {
      const email = e2eMailboxFor(handle);
      const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
      if (existing.length > 0) continue;
      const id = crypto.randomUUID();
      await db.insert(user).values({
        id,
        name: handle,
        email,
        username: handle,
        displayUsername: handle,
        // Verified by construction: e2e mailboxes are fictional, and the flag
        // lets the fake-OAuth handshake link its provider to this password
        // row (Better Auth refuses implicit linking to unverified local
        // mailboxes). No app flow gates on it (requireEmailVerification is
        // off), so specs see identical behavior.
        emailVerified: true,
      });
      await db.insert(account).values({
        accountId: id,
        providerId: CREDENTIAL_PROVIDER_ID,
        userId: id,
        password,
      });
    }
  } finally {
    await client.end();
  }
}
