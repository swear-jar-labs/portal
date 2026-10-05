import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Migration files carry a UTC timestamp (20261003204512_sync_levels.sql)
  // instead of a serial: the name says what changed, the prefix says when.
  migrations: { prefix: "timestamp" },
  strict: true,
  verbose: true,
});
