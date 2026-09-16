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

test("keeps the menu dropdown above the file list on a cold inner route", async ({ page }) => {
  // Without a boot the CRT switch-on (and the stacking context its animation
  // leaves behind) is absent, so the dropdown must carry itself with z-index
  // over the file table's sticky header.
  await page.goto("/apply");

  await page.getByRole("menuitem", { name: "File" }).click();
  await expect(page.getByRole("menu")).toBeVisible();

  const coveredBy = await page.evaluate(() => {
    const menu = document.querySelector('[role="menu"]');
    const header = document.querySelector("thead th");
    if (!menu || !header) return "missing menu or header";
    const menuRect = menu.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const x = Math.max(menuRect.left, headerRect.left) + 2;
    const y = Math.max(menuRect.top, headerRect.top) + 2;
    const overlaps =
      x < Math.min(menuRect.right, headerRect.right) &&
      y < Math.min(menuRect.bottom, headerRect.bottom);
    if (!overlaps) return "no overlap to check";
    const top = document.elementFromPoint(x, y);
    return menu.contains(top) ? "" : (top?.textContent ?? "unknown").slice(0, 20);
  });
  expect(coveredBy).toBe("");
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

test.describe("file tree", () => {
  test("indents files under their expanded directory", async ({ page }) => {
    await enterShell(page);

    // READ is expanded by default and ABOUT is its first file.
    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    const dirIcon = await files.locator("#dir-read svg").boundingBox();
    const fileIcon = await files.locator("#file-ABOUT svg").boundingBox();
    if (!dirIcon || !fileIcon) throw new Error("file rows are not rendered");

    expect(fileIcon.x - dirIcon.x).toBeGreaterThanOrEqual(8);
  });
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
    await expect(dialog.locator("[data-dos-window-body]")).toBeFocused();
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
