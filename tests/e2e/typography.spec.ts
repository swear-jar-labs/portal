import { expect, test, type Locator } from "@playwright/test";
import { DOS_WINDOW_BODY_ATTR } from "@swearjar/dos/contracts";
import { FEED_PATH } from "../../src/features/board/model/threads";
import { projectPath } from "../../src/features/projects/model/projects";
import { enterShell, expectMinimumContrast, waitForHydration } from "./helpers";

test.beforeEach(async ({ page }) => {
  await enterShell(page);
});

function fontSize(locator: Locator): Promise<number> {
  return locator.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
}

test("keeps hints smaller and on the surface ink", async ({ page }) => {
  const input = page.getByLabel("Command line");
  await input.focus();
  await page.keyboard.type("ASDF");
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  const body = dialog.getByText("The jar clinks. +1 coin.");
  const hint = dialog.getByText("Try HELP.");

  // A hint is dim and 0.9em; its weight and ink follow the surface, so on the
  // light family it is bold with the smear, like the body around it.
  await expect(hint).toHaveCSS("font-weight", "700");
  await expect(hint).toHaveCSS("-webkit-text-stroke-width", "0px");
  expect(await hint.evaluate((element) => getComputedStyle(element).textShadow)).not.toBe("none");
  expect(await fontSize(hint)).toBeCloseTo((await fontSize(body)) * 0.9, 1);
});

test("keeps the board secondary text on the surface ink", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);

  const sortLabel = page.getByText("SORT", { exact: true });
  await expect(sortLabel).toHaveCSS("font-weight", "700");
  await expect(sortLabel).toHaveCSS("-webkit-text-stroke-width", "0px");
  expect(await sortLabel.evaluate((element) => getComputedStyle(element).textShadow)).not.toBe(
    "none",
  );

  const cardMeta = page.getByText(/VOTES/).first();
  await expect(cardMeta).toHaveCSS("font-weight", "700");
  await expect(cardMeta).toHaveCSS("-webkit-text-stroke-width", "0px");

  await expect(page.locator("#thread-card-ci-cache-poisoning")).toHaveCSS("color", "rgb(0, 0, 0)");
});

test("keeps light surfaces on the real bold with the smear, not a stroke", async ({ page }) => {
  const paperBody = page.getByText("A software workshop", { exact: true });
  await expect(paperBody).toHaveCSS("font-weight", "700");
  // The extra weight is a phase-stable text-shadow smear, never a sub-pixel
  // text-stroke, whose rendering flips with the layout phase.
  await expect(paperBody).toHaveCSS("-webkit-text-stroke-width", "0px");
  expect(await paperBody.evaluate((element) => getComputedStyle(element).textShadow)).not.toBe(
    "none",
  );

  // File rows are buttons (docs) or links (routed EXEs): the UA control reset
  // must not drop the surface ink on either.
  for (const row of ["MANIFESTO", "FORUM"]) {
    const control = page.locator("tbody tr", { hasText: row }).locator("a, button").first();
    await expect(control).toBeVisible();
    expect(await control.evaluate((element) => getComputedStyle(element).textShadow)).not.toBe(
      "none",
    );
  }

  await page.keyboard.press("F5");
  const doom = page.getByRole("dialog");
  const doomText = doom.getByText("This is the only OS DOOM has not been ported to yet.");
  await expect(doomText).toHaveCSS("font-weight", "700");
  await expect(doomText).toHaveCSS("-webkit-text-stroke-width", "0px");
  await doom.getByRole("button", { name: "Close" }).click();

  await page.keyboard.press("F1");
  const help = page.getByRole("dialog").locator(`[${DOS_WINDOW_BODY_ATTR}] > div`);
  await expect(help).toHaveCSS("font-weight", "700");
});

test("keeps the ladder keywords readable in magenta", async ({ page }) => {
  // The N DONE / EVERYONE keywords wear a content tone on UI text — a
  // documented exception (no role hue is free) — so their contrast is pinned.
  await page.goto(projectPath("tooling"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "Tooling" });
  await panel.getByRole("tab", { name: "TEAM" }).click();
  await expectMinimumContrast(panel.getByText("2 DONE"));
  await expectMinimumContrast(panel.getByText("EVERYONE"));
});
