import { expect, test } from "@playwright/test";
import { enterShell, expectNoViolations, waitForHydration } from "./helpers";

const DOCS: Readonly<Record<string, string>> = {
  "/how": "HOW IT WORKS",
  "/manifesto": "THE MANIFESTO",
  "/rules": "RULES.TXT",
};

test("doc routes render their document", async ({ page }) => {
  for (const [path, heading] of Object.entries(DOCS)) {
    await page.goto(path);
    await waitForHydration(page);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
});

test("the about workshop link opens how-it-works", async ({ page }) => {
  await enterShell(page);
  const workshop = page.getByRole("link", { name: "A software workshop" });
  await expect(workshop).toBeVisible();
  await workshop.click();
  await expect(page).toHaveURL("/how");
  await expect(page.getByRole("heading", { name: "HOW IT WORKS" }).first()).toBeVisible();
});

test("the how route walks by keyboard with no violations", async ({ page }) => {
  await page.goto("/how");
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "HOW-IT-WORKS.TXT" });
  await expect(panel).toBeVisible();

  await page.locator("#file-HOW").focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowDown");
  const inside = await panel.evaluate((element) => element.contains(document.activeElement));
  expect(inside).toBe(true);
  await expectNoViolations(page, "how route");
});
