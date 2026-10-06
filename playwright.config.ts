// Load .env before anything reads process.env: the config resolves the e2e
// database URL (E2E_DATABASE_URL or the local default) and the global setup
// compares it against DATABASE_URL — both sides must see the same values.
import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

import { E2E_BASE_URL, E2E_PORT, resolveE2eDatabaseUrl } from "./tests/e2e/e2e-accounts";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  // Integration flows legitimately run 20-30s; the stock 30s test timeout and
  // 5s expect timeout kill them when the same machine also compiles and serves
  // the dev bundle to 8 parallel browsers (see tasks/ui-notification-events).
  // Four workers keep the dev server responsive; the suite runs longer but
  // stops timing out on a loaded box.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 4,
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${E2E_PORT}`,
    env: {
      SWEARJAR_E2E: "1",
      // The run owns its database: the global setup recreates it, so the
      // server must point at it — never at the development database. The
      // OAuth callbacks are loopback too, hence the port-3100 base URL.
      DATABASE_URL: resolveE2eDatabaseUrl(),
      BETTER_AUTH_URL: E2E_BASE_URL,
    },
    url: E2E_BASE_URL,
    reuseExistingServer: false,
  },
});
