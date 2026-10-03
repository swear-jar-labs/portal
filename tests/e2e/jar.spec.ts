import { expect, test } from "@playwright/test";
import { enterShell, expectNoViolations } from "./helpers";

const JAR_BUTTON = "Open the swear jar stats";

test("the jar brand opens the 24-hour stats", async ({ page }) => {
  await enterShell(page);

  // The brand is a mark: bold like the menu bar it stands beside.
  await expect(page.getByRole("button", { name: JAR_BUTTON })).toHaveCSS("font-weight", "700");

  await page.getByRole("button", { name: JAR_BUTTON }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("The jar is empty. Learning in progress.")).toBeVisible();
  await expect(dialog.getByText("LAST 24 HOURS")).toBeVisible();
  await expect(dialog.getByText("BAD COMMANDS: 0")).toBeVisible();
  await expect(dialog.getByText("ERRATA THREADS: 0")).toBeVisible();
  await expect(dialog.getByText("BUG TICKETS: 0")).toBeVisible();

  // Bugs read first, then errata, then the command misses.
  const order = await dialog.evaluate((element) => (element as HTMLElement).innerText);
  expect(order.indexOf("BUG TICKETS")).toBeLessThan(order.indexOf("ERRATA THREADS"));
  expect(order.indexOf("ERRATA THREADS")).toBeLessThan(order.indexOf("BAD COMMANDS"));

  await expectNoViolations(page, "jar dialog");
});

test("the jar brand opens from the keyboard", async ({ page }) => {
  await enterShell(page);

  await page.getByRole("button", { name: JAR_BUTTON }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog").getByText("LAST 24 HOURS")).toBeVisible();
});

test("a bad command feeds the jar and names the miss", async ({ page }) => {
  await enterShell(page);

  const input = page.getByLabel("Command line");
  await input.focus();
  await page.keyboard.type("ASDF");
  await page.keyboard.press("Enter");
  const error = page.getByRole("dialog");
  await expect(error.getByText("The jar clinks. +1 lesson.")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(error).toBeHidden();

  await page.getByRole("button", { name: JAR_BUTTON }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("1 COIN. Learning in progress.")).toBeVisible();
  await expect(dialog.getByText("BAD COMMANDS: 1")).toBeVisible();
  await expect(dialog.getByText("TOP MISSES")).toBeVisible();
  await expect(dialog.getByText("ASDF: 1")).toBeVisible();
});

test("the jar links open errata and bug tickets", async ({ page }) => {
  await enterShell(page);

  await page.getByRole("button", { name: JAR_BUTTON }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "OPEN ERRATA" }).click();
  await expect(page).toHaveURL("/forum?board=errata");

  await page.getByRole("button", { name: JAR_BUTTON }).click();
  await page.getByRole("dialog").getByRole("button", { name: "OPEN BUG TICKETS" }).click();
  await expect(page).toHaveURL("/tickets?tag=bug");
});
