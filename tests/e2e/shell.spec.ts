import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { DOS_CRT_ATTR, DOS_SCROLL_ATTR, DOS_WINDOW_BODY_ATTR } from "@swearjar/dos/contracts";
import { enterShell, expectMinimumContrast, logon } from "./helpers";

// /errata has no page of its own: ERRATA opens the feed with ?board=errata,
// so the RSC 404 falls back to a full load here.
const STUB_ROUTE = "/errata";

test("opens inner routes directly and keeps the shell chrome", async ({ page }) => {
  await page.goto(STUB_ROUTE);

  await expect(page.getByRole("menubar")).toBeVisible();
  await expect(page.getByRole("region", { name: "C:\\SWEARJAR" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "PATH NOT FOUND" })).toBeVisible();

  // The shell opens without a switch-on animation.
  const animation = await page.getByRole("menubar").evaluate((element) => {
    const shell = element.parentElement;
    return shell ? getComputedStyle(shell).animationName : "missing";
  });
  expect(animation).toBe("none");

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("orders the top menu as COMMUNITY, ACCOUNT, GUIDE and HELP", async ({ page }) => {
  await page.goto("/apply");

  const triggers = await page
    .getByRole("menubar")
    .getByRole("menuitem")
    .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim()));
  expect(triggers).toEqual(["Community", "Account", "Guide", "Help"]);
});

test("shows each function key on its menu entry", async ({ page }) => {
  await enterShell(page);

  await page.getByRole("menuitem", { name: "Account", exact: true }).click();
  const logon = page.getByRole("menuitem", { name: "Logon", exact: true });
  // The hint stays out of the accessible name: the shortcut rides ARIA.
  await expect(logon).toHaveAttribute("aria-keyshortcuts", "F10");
  await expect(logon.getByText("F10", { exact: true })).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("menuitem", { name: "Register", exact: true })).toHaveAttribute(
    "aria-keyshortcuts",
    "F8",
  );

  await page.keyboard.press("Escape");
  await page.getByRole("menuitem", { name: "Guide", exact: true }).click();
  // An entry without a key carries no shortcut at all.
  const doom = page.getByRole("menuitem", { name: "Doom", exact: true });
  await expect(doom).toBeVisible();
  expect(await doom.getAttribute("aria-keyshortcuts")).toBeNull();
});

test("keeps the menu dropdown above the file list on a cold inner route", async ({ page }) => {
  // The shell carries no switch-on animation (and no stacking context from it),
  // so the dropdown must carry itself with z-index
  // over the file table's sticky header.
  await page.goto("/apply");

  await page.getByRole("menuitem", { name: "Guide" }).click();
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

test("draws the CRT filter above portaled surfaces", async ({ page }) => {
  await page.goto("/");

  // The screen's pseudo-elements are the filter: click-through, above every
  // portaled surface (landing window, menu); the screensaver keeps its layer.
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

  const welcome = page.getByRole("dialog");
  await expect(welcome).toBeVisible();
  // The landing window positions through its overlay layer: the filter must
  // sit above that layer.
  const dialogZ = Number(
    await welcome.evaluate((element) =>
      element.parentElement ? getComputedStyle(element.parentElement).zIndex : "auto",
    ),
  );
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
  await files.getByRole("link", { name: "FORUM" }).click();

  // The Board page exists now: the shell survives through a soft navigation.
  await expect(page).toHaveURL("/forum");
  await expect(page.getByRole("menubar")).toBeVisible();
  await expect(files.getByRole("link", { name: "FORUM" })).toHaveAttribute("aria-current", "true");

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
  await files.getByRole("link", { name: "REGISTER" }).click();
  await expect(page).toHaveURL("/register");
  const panel = page.getByRole("region", { name: "REGISTER.EXE" }).locator(`[${DOS_SCROLL_ATTR}]`);
  await expect(panel).toBeFocused();

  await files.getByRole("link", { name: "REGISTER" }).click();
  await expect(panel).toBeFocused();
});

test("keeps the panel keyboard when a route takes a slow reply", async ({ page }) => {
  await enterShell(page);
  const files = page.getByRole("region", { name: "C:\\SWEARJAR" });

  // The armed request must survive a navigation that outlives the transition
  // window: the keyboard lands in the panel when the route finally commits.
  await page.route("**/forum**", async (route) => {
    if (route.request().url().includes("_rsc")) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    await route.continue();
  });
  await files.getByRole("link", { name: "FORUM" }).click();

  const feed = page.getByRole("region", { name: "FORUM.EXE" });
  await expect(feed.getByRole("article")).toHaveCount(14);
  await expect(feed.locator(`[${DOS_SCROLL_ATTR}]`)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(feed.getByRole("combobox", { name: "BOARD" })).toBeFocused();
});

test("keeps the keyboard in the list when a doc opens", async ({ page }) => {
  await enterShell(page);
  const files = page.getByRole("region", { name: "C:\\SWEARJAR" });

  await files.getByRole("link", { name: "MANIFESTO" }).click();
  await expect(page).toHaveURL("/manifesto");
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

test.describe("landing", () => {
  test("presents the hero in the fullscreen window on first open", async ({ page }) => {
    await page.goto("/");

    const window = page.getByRole("dialog");
    await expect(
      window.getByRole("heading", { name: "MAKE SOFTWARE ENGINEERING GREAT AGAIN" }),
    ).toBeVisible();
    await expect(window.getByText("How will you write code when AI rises?")).toBeVisible();
    await expect(window.getByRole("link", { name: "JOIN THE TEAM" })).toBeVisible();
    await expect(window.getByRole("link", { name: "HOW IT WORKS" })).toBeVisible();
    await expectMinimumContrast(window.getByText("How will you write code when AI rises?"));
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  test("hands focus to the window body on open and closes with Escape", async ({ page }) => {
    await page.goto("/");

    const window = page.getByRole("dialog");
    const body = window.locator(`[${DOS_WINDOW_BODY_ATTR}]`);
    await expect(body).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(window).toBeHidden();
  });

  test("joins the team from the primary action", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("dialog").getByRole("link", { name: "JOIN THE TEAM" }).click();
    await expect(page).toHaveURL("/forum");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("region", { name: "FORUM.EXE" })).toBeVisible();
  });

  test("scrolls to the box from HOW IT WORKS without leaving home", async ({ page }) => {
    await page.goto("/");

    const window = page.getByRole("dialog");
    await window.getByRole("link", { name: "HOW IT WORKS" }).click();
    await expect(page).toHaveURL("/");
    await expect(window.getByRole("heading", { name: "WHAT'S IN THE BOX" })).toBeInViewport();
    await expect(window.getByRole("link", { name: "OPEN FORUM" })).toBeVisible();
  });

  test("closes into the shell", async ({ page }) => {
    await page.goto("/");

    const window = page.getByRole("dialog");
    await window.getByRole("button", { name: "Close" }).click();
    await expect(window).toBeHidden();
    await expect(page.getByRole("menubar")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "SWEAR JAR LABS" })).toBeVisible();
  });

  test("rings the window back from WELCOME", async ({ page }) => {
    await enterShell(page);

    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    await files.getByRole("button", { name: "WELCOME" }).click();

    const window = page.getByRole("dialog");
    await expect(
      window.getByRole("heading", { name: "MAKE SOFTWARE ENGINEERING GREAT AGAIN" }),
    ).toBeVisible();
  });

  test("rings the window back from WELCOME as a member", async ({ page }) => {
    await logon(page);
    await page.goto("/forum");

    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    await expect(files.getByRole("button", { name: "WELCOME" })).toBeVisible();
    await files.getByRole("button", { name: "WELCOME" }).click();

    await expect(page).toHaveURL("/");
    const window = page.getByRole("dialog");
    await expect(
      window.getByRole("heading", { name: "MAKE SOFTWARE ENGINEERING GREAT AGAIN" }),
    ).toBeVisible();
    await window.getByRole("button", { name: "Close" }).click();
    await expect(window).toBeHidden();
  });

  test("fits the place actions on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto("/");

    const window = page.getByRole("dialog");
    const body = window.locator(`[${DOS_WINDOW_BODY_ATTR}]`);
    await expect(window.getByRole("link", { name: "OPEN PROJECTS" })).toBeVisible();
    expect(await body.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  });

  test("does not show again when a routed file leads back home", async ({ page }) => {
    await enterShell(page);

    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    await files.getByRole("link", { name: "REGISTER" }).click();
    await expect(page).toHaveURL("/register");

    await files.getByRole("link", { name: "ABOUT" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("does not show when home opens after a deep link", async ({ page }) => {
    await page.goto("/register");

    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    await files.getByRole("link", { name: "ABOUT" }).click();

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
    const register = files.getByRole("link", { name: "REGISTER" });
    await register.click();

    await expect(page).toHaveURL("/register");
    await expect(page.getByRole("menubar")).toBeVisible();
    await expect(register).toHaveAttribute("aria-current", "true");

    await page.goBack();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("menubar")).toBeVisible();
    await expect(register).not.toHaveAttribute("aria-current", "true");

    await input.focus();
    await page.keyboard.type("ASDF");
    await page.keyboard.press("Enter");
    await expect(dialog.getByText("JAR: 2 COINS", { exact: true })).toBeVisible();
  });

  test("selects the route file on a direct visit", async ({ page }) => {
    await page.goto("/register");

    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    await expect(files.getByRole("link", { name: "REGISTER" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    // Sections own their route; docs are current only on their own route.
    await expect(files.getByRole("link", { name: "ABOUT" })).not.toHaveAttribute(
      "aria-current",
      "true",
    );

    await page.keyboard.press("ArrowDown");
    await expect(files.locator("#file-LOGON")).toBeFocused();
  });
});
