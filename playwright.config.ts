import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = 3100;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
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
    env: { SWEARJAR_E2E: "1" },
    url: E2E_BASE_URL,
    reuseExistingServer: false,
  },
});
