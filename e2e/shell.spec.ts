import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { enterShell } from "./helpers";

const INNER_ROUTE = "/discussions";

test("does not boot on inner routes and keeps the shell chrome", async ({ page }) => {
  await page.goto(INNER_ROUTE);

  await expect(page.getByRole("menubar")).toBeVisible();
  await expect(page.getByRole("region", { name: "C:\\SWEARJAR" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "PATH NOT FOUND" })).toBeVisible();
  await expect(page.getByText("SWEARJAR.DOS /LOAD")).toHaveCount(0);

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("keeps the shell when a board file navigates to a route", async ({ page }) => {
  await enterShell(page);

  const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
  await files.getByRole("link", { name: /DISCUSSIONS/ }).click();

  await expect(page).toHaveURL(INNER_ROUTE);
  await expect(page.getByRole("menubar")).toBeVisible();
});
