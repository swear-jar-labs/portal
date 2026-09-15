import { expect, test } from "@playwright/test";
import { defaultScreensaver } from "../src/content/settings";

test("the starfield screensaver wakes on any key", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.clock.runFor(300);
  await expect(page.getByText("SWEARJAR.DOS /LOAD")).toBeVisible();
  await page.keyboard.press("Enter");
  await page.clock.runFor(600);

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();

  await page.clock.runFor(defaultScreensaver.delayMs + 1_000);

  const canvas = page.getByRole("img", { name: "Starfield screensaver" });
  await expect(canvas).toBeVisible();
  await expect(page.getByText("PRESS ANY KEY TO WAKE UP")).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(canvas).toBeHidden();
});
