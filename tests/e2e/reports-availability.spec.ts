import { expect, test } from "@playwright/test";
import { logon, waitForHydration } from "./helpers";

const THREAD = "/forum/read-first";
const REPLY = "#board-post-read-first-2";

test("reports survive a reload without blinking the file away", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(THREAD);
  await waitForHydration(page);
  const reply = page.locator(REPLY);
  await reply.getByRole("button", { name: "REPORT" }).click();
  const form = page.getByRole("dialog", { name: "REPORT CONTENT" });
  await form.getByRole("textbox", { name: "Reason" }).fill("This reply includes private data.");
  await form.getByRole("button", { name: "SEND REPORT" }).click();
  await expect(reply.getByText("REPORT SENT")).toBeVisible();
  await expect(page.locator("#file-REPORTS")).toBeVisible();

  // The seed cookie lands so the next first paint already carries REPORTS.
  await expect.poll(() => page.evaluate(() => document.cookie)).toContain("sj_reports_ada=1");

  await page.reload();
  await expect(page.locator("#file-REPORTS")).toBeVisible();
});

test("a stale seed self-corrects once the store loads", async ({ page }) => {
  await logon(page, "ken");
  await page.goto("/");
  await waitForHydration(page);
  await expect(page.locator("#file-REPORTS")).toHaveCount(0);

  // A seed with no reports behind it shows the file on first paint, then the
  // loaded store takes over and hides it again.
  await page.evaluate(() => {
    document.cookie = "sj_reports_ken=1; path=/; max-age=31536000; samesite=lax";
  });
  await page.reload();
  await expect(page.locator("#file-REPORTS")).toHaveCount(0);
});
