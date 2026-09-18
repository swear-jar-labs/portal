import { expect, test, type Locator } from "@playwright/test";
import { DOS_WINDOW_BODY_ATTR } from "@swearjar/dos/contracts";
import { enterShell } from "./helpers";

test.beforeEach(async ({ page }) => {
  await enterShell(page);
});

function fontSize(locator: Locator): Promise<number> {
  return locator.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
}

test("keeps hints regular, stroked and smaller than the text they annotate", async ({ page }) => {
  const input = page.getByLabel("Command line");
  await input.focus();
  await page.keyboard.type("ASDF");
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  const body = dialog.getByText("The jar clinks. +1 coin.");
  const hint = dialog.getByText("Try HELP.");

  await expect(hint).toHaveCSS("font-weight", "400");
  // Greybeard ships real 400/700 only; a light stroke carries the "a bit bolder".
  const stroke = await hint.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).getPropertyValue("-webkit-text-stroke-width")),
  );
  expect(stroke).toBeGreaterThan(0);
  expect(await fontSize(hint)).toBeCloseTo((await fontSize(body)) * 0.9, 1);
});

test("keeps light-surface dialog body bold", async ({ page }) => {
  await page.keyboard.press("F5");
  const doom = page.getByRole("dialog");
  const doomText = doom.getByText("This is the only OS DOOM has not been ported to yet.");
  await expect(doomText).toHaveCSS("font-weight", "700");
  await doom.getByRole("button", { name: "Close" }).click();

  await page.keyboard.press("F1");
  const help = page.getByRole("dialog").locator(`[${DOS_WINDOW_BODY_ATTR}] > div`);
  await expect(help).toHaveCSS("font-weight", "700");
});
