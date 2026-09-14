import { expect, type Page } from "@playwright/test";

export async function enterShell(page: Page) {
  await page.goto("/");
  await expect(page.getByText("SWEARJAR.DOS /LOAD")).toBeVisible();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "WELCOME TO SWEARJAR.DOS" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
}
