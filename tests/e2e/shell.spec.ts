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

  // Without a boot there is no CRT switch-on either.
  const animation = await page.getByRole("menubar").evaluate((element) => {
    const shell = element.parentElement;
    return shell ? getComputedStyle(shell).animationName : "missing";
  });
  expect(animation).toBe("none");

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("keeps the shell when a board file navigates to a route", async ({ page }) => {
  await enterShell(page);

  const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
  await files.getByRole("link", { name: "DISCUSSIONS" }).click();

  // The route has no page yet: Next answers the RSC request with a 404 and
  // falls back to a full load; the shell survives because the layout renders
  // the 404 panel. Once the Board page exists this becomes a soft navigation.
  await expect(page).toHaveURL(INNER_ROUTE);
  await expect(page.getByRole("menubar")).toBeVisible();
  await expect(files.getByRole("link", { name: "DISCUSSIONS" })).toHaveAttribute(
    "aria-current",
    "true",
  );
});

test.describe("welcome", () => {
  test("does not greet again when a routed file leads back home", async ({ page }) => {
    await enterShell(page);

    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    await files.getByRole("link", { name: "APPLY" }).click();
    await expect(page).toHaveURL("/apply");

    await files.getByRole("button", { name: "MANIFESTO" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("does not greet when home opens after a deep link", async ({ page }) => {
    await page.goto("/apply");

    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    await files.getByRole("button", { name: "MANIFESTO" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("spa navigation", () => {
  test("navigates without a reload and follows the route on back/forward", async ({ page }) => {
    await enterShell(page);

    // A coin is the reload detector: a full page load resets the counter.
    const input = page.getByLabel("Command line");
    await input.focus();
    await page.keyboard.type("ASDF");
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(page.getByText("JAR: 1 COIN", { exact: true })).toBeVisible();

    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    const apply = files.getByRole("link", { name: "APPLY" });
    await apply.click();

    await expect(page).toHaveURL("/apply");
    await expect(page.getByRole("menubar")).toBeVisible();
    await expect(page.getByText("JAR: 1 COIN", { exact: true })).toBeVisible();
    await expect(apply).toHaveAttribute("aria-current", "true");

    await page.goBack();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("menubar")).toBeVisible();
    await expect(page.getByText("JAR: 1 COIN", { exact: true })).toBeVisible();
    await expect(apply).not.toHaveAttribute("aria-current", "true");
  });

  test("selects the route file on a direct visit", async ({ page }) => {
    await page.goto("/apply");

    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    await expect(files.getByRole("link", { name: "APPLY" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    // Documents belong to the home panel, not to a section route.
    await expect(files.getByRole("button", { name: "ABOUT" })).not.toHaveAttribute(
      "aria-current",
      "true",
    );

    await page.keyboard.press("ArrowDown");
    await expect(files.locator("#file-LOGON")).toBeFocused();
  });
});
