import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";
import * as schema from "./schema";

// The runtime guard against a stalled database: the driver fails a connection
// attempt after this many seconds and a server-side statement after this many
// milliseconds, so a hanging query surfaces as an error instead of a request
// that never answers (see getActorSession, which treats that error as a guest).
const DB_CONNECT_TIMEOUT_S = 5;
const DB_STATEMENT_TIMEOUT_MS = 4000;

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb.client ??
  postgres(env.DATABASE_URL, {
    max: 10,
    prepare: false,
    connect_timeout: DB_CONNECT_TIMEOUT_S,
    connection: { statement_timeout: DB_STATEMENT_TIMEOUT_MS },
  });

if (env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
