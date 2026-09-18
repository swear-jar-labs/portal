import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  DOS_CRT_ATTR,
  DOS_SCROLL_ATTR,
  DOS_SURFACE_ATTR,
  DOS_WINDOW_BODY_ATTR,
} from "@swearjar/dos/contracts";
import { enterShell, expectMinimumContrast } from "./helpers";

// A section without a page yet: the RSC 404 falls back to a full load.
const STUB_ROUTE = "/errata";

test("does not boot on inner routes and keeps the shell chrome", async ({ page }) => {
  await page.goto(STUB_ROUTE);

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

test("draws the CRT filter above the boot screen and portaled surfaces", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("SWEARJAR.DOS /LOAD")).toBeVisible();

  // The screen's pseudo-elements are the filter: click-through, above every
  // portaled surface (welcome dialog, menu); the screensaver keeps its layer.
  const screen = page.locator(`[${DOS_CRT_ATTR}]`);
  await expect(screen).toBeVisible();
  const filter = await screen.evaluate((element) => {
    const scanlines = getComputedStyle(element, "::before");
    const vignette = getComputedStyle(element, "::after");
    return {
      position: scanlines.position,
      pointerEvents: scanlines.pointerEvents,
      scanlines: scanlines.backgroundImage,
      vignette: vignette.backgroundImage,
      zIndex: Number(scanlines.zIndex),
    };
  });
  expect(filter.position).toBe("absolute");
  expect(filter.pointerEvents).toBe("none");
  expect(filter.scanlines).toContain("repeating-linear-gradient");
  expect(filter.vignette).toContain("radial-gradient");

  await page.keyboard.press("Enter");
  const welcome = page.getByRole("dialog");
  await expect(welcome).toBeVisible();
  const dialogZ = Number(await welcome.evaluate((element) => getComputedStyle(element).zIndex));
  expect(filter.zIndex).toBeGreaterThan(dialogZ);
  await welcome.getByRole("button", { name: "Close" }).click();

  await page.getByRole("menuitem", { name: "Help" }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  const menuZ = Number(await menu.evaluate((element) => getComputedStyle(element).zIndex));
  expect(filter.zIndex).toBeGreaterThan(menuZ);
});

test("navigates from the board file to the route without a reload", async ({ page }) => {
  await enterShell(page);

  // A coin is the reload detector: a full page load resets the counter.
  const input = page.getByLabel("Command line");
  await input.focus();
  await page.keyboard.type("ASDF");
  await page.keyboard.press("Enter");
  const error = page.getByRole("dialog");
  await expect(error.locator(`[${DOS_WINDOW_BODY_ATTR}]`)).toBeFocused();
  await expect(error.getByText("JAR: 1 COIN", { exact: true })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(error).toBeHidden();

  const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
  await files.getByRole("link", { name: "DISCUSSIONS" }).click();

  // The Board page exists now: the shell survives through a soft navigation.
  await expect(page).toHaveURL("/discussions");
  await expect(page.getByRole("menubar")).toBeVisible();
  await expect(files.getByRole("link", { name: "DISCUSSIONS" })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await input.focus();
  await page.keyboard.type("ASDF");
  await page.keyboard.press("Enter");
  await expect(error.getByText("JAR: 2 COINS", { exact: true })).toBeVisible();
});

test("hands the keyboard to the right panel after a routed file opens", async ({ page }) => {
  await enterShell(page);
  const files = page.getByRole("region", { name: "C:\\SWEARJAR" });

  // An EXE route: the panel arrives together with the page and takes the
  // keyboard; opening it again (same route) focuses it right away.
  await files.getByRole("link", { name: "APPLY" }).click();
  await expect(page).toHaveURL("/apply");
  const panel = page.getByRole("region", { name: "APPLY.EXE" }).locator(`[${DOS_SCROLL_ATTR}]`);
  await expect(panel).toBeFocused();

  await files.getByRole("link", { name: "APPLY" }).click();
  await expect(panel).toBeFocused();
});

test("keeps the panel keyboard when a route takes a slow reply", async ({ page }) => {
  await enterShell(page);
  const files = page.getByRole("region", { name: "C:\\SWEARJAR" });

  // The armed request must survive a navigation that outlives the transition
  // window: the keyboard lands in the panel when the route finally commits.
  await page.route("**/discussions**", async (route) => {
    if (route.request().url().includes("_rsc")) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    await route.continue();
  });
  await files.getByRole("link", { name: "DISCUSSIONS" }).click();

  const feed = page.getByRole("region", { name: "DISCUSSIONS.EXE" });
  await expect(feed.getByRole("article")).toHaveCount(8);
  await expect(feed.locator(`[${DOS_SCROLL_ATTR}]`)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(feed.getByRole("combobox", { name: "BOARD" })).toBeFocused();
});

test("keeps the keyboard in the list when a doc opens", async ({ page }) => {
  await enterShell(page);
  const files = page.getByRole("region", { name: "C:\\SWEARJAR" });

  await files.getByRole("button", { name: "MANIFESTO" }).click();
  await expect(page.getByRole("region", { name: "MANIFESTO.TXT" })).toBeVisible();
  await expect(files.locator("#file-MANIFESTO")).toBeFocused();
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
  test("uses the silver surface with readable blue and green accents", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("SWEARJAR.DOS /LOAD")).toBeVisible();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog");
    const body = dialog.locator(`[${DOS_WINDOW_BODY_ATTR}]`);
    const heading = dialog.getByRole("heading", { name: "WELCOME TO SWEARJAR.DOS" });
    // The heading role colors the h2; the welcome override sits on its span.
    const headingText = heading.locator("span");
    const prompt = dialog.getByText("> ", { exact: true }).first();
    await expect(body).toHaveAttribute(DOS_SURFACE_ATTR, "light");
    await expect(headingText).toHaveCSS("color", "rgb(0, 0, 204)");
    await expect(prompt).toHaveCSS("color", "rgb(0, 90, 0)");
    await expectMinimumContrast(headingText);
    await expectMinimumContrast(prompt);
    await expectMinimumContrast(dialog.getByText("The public terminal of Swear Jar Labs"));
  });

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
    await expect(dialog.locator(`[${DOS_WINDOW_BODY_ATTR}]`)).toBeFocused();
    await expect(dialog.getByText("JAR: 1 COIN", { exact: true })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();

    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    const apply = files.getByRole("link", { name: "APPLY" });
    await apply.click();

    await expect(page).toHaveURL("/apply");
    await expect(page.getByRole("menubar")).toBeVisible();
    await expect(apply).toHaveAttribute("aria-current", "true");

    await page.goBack();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("menubar")).toBeVisible();
    await expect(apply).not.toHaveAttribute("aria-current", "true");

    await input.focus();
    await page.keyboard.type("ASDF");
    await page.keyboard.press("Enter");
    await expect(dialog.getByText("JAR: 2 COINS", { exact: true })).toBeVisible();
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
