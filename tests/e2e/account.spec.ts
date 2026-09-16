import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { SCREENSAVER_PREFS_STORAGE_KEY } from "../../src/features/shell/screensaver-prefs";
import { screensaverDelayMs } from "../../src/content/settings";
import { enterShell } from "./helpers";

const FILES_REGION = "C:\\SWEARJAR";
const USER_LABEL = "User";
const PASSWORD_LABEL = "Password";
const SUBMIT_BUTTON = "[ SUBMIT ]";
const LONG_DELAY_MS = screensaverDelayMs(30);
const MINUTE_MS = 60_000;

async function logon(page: Page, user = "ada") {
  await page.goto("/login");
  await page.getByLabel(USER_LABEL).fill(user);
  await page.getByLabel(PASSWORD_LABEL).fill("secret");
  await page.getByRole("button", { name: "[ LOG ON ]" }).click();
  await expect(page).toHaveURL("/profile");
}

async function expectNoViolations(page: Page, context: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations, context).toEqual([]);
}

async function skipBootAsGuest(page: Page) {
  await page.clock.runFor(300);
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();

  await expect(page.getByRole("menubar")).toBeVisible();
}

test.describe("guest account chrome", () => {
  test("shows apply and logon only", async ({ page }) => {
    await enterShell(page);
    const files = page.getByRole("region", { name: FILES_REGION });

    await expect(files.getByRole("link", { name: "APPLY" })).toBeVisible();
    await expect(files.getByRole("link", { name: "LOGON" })).toBeVisible();
    await expect(files.getByRole("link", { name: "PROFILE" })).toHaveCount(0);
    await expect(files.getByRole("link", { name: "SETTINGS" })).toHaveCount(0);
    await expect(files.getByRole("button", { name: "LOGOFF" })).toHaveCount(0);
    await expect(files.getByText("3 DIRS, 12 FILES")).toBeVisible();

    await expect(page.getByRole("button", { name: "F8 Apply" })).toBeVisible();
    await expect(page.getByRole("button", { name: "F9 Logon" })).toBeVisible();
    await expect(page.getByText("GUEST", { exact: true })).toBeVisible();
  });

  test("gates member routes instead of opening them", async ({ page }) => {
    await page.goto("/profile");
    const gate = page.getByRole("region", { name: "PROFILE.EXE" });
    await expect(page.getByRole("heading", { level: 1, name: "AUTH REQUIRED" })).toBeVisible();
    await expect(gate.getByRole("link", { name: "LOGON" })).toBeVisible();
    await expect(gate.getByRole("link", { name: "APPLY" })).toBeVisible();
    await expectNoViolations(page, "/profile gate");

    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1, name: "AUTH REQUIRED" })).toBeVisible();
  });
});

test.describe("member session", () => {
  test("logon swaps the account chrome and skips the guest welcome", async ({ page }) => {
    await logon(page);
    await expect(page.getByRole("heading", { level: 1, name: "ada" })).toBeVisible();

    await page.goto("/");
    await page.keyboard.press("Enter");

    const files = page.getByRole("region", { name: FILES_REGION });
    await expect(files.getByRole("link", { name: "PROFILE" })).toBeVisible();
    await expect(files.getByRole("link", { name: "SETTINGS" })).toBeVisible();
    await expect(files.getByRole("button", { name: "LOGOFF" })).toBeVisible();
    await expect(files.getByRole("link", { name: "APPLY" })).toHaveCount(0);
    await expect(files.getByText("3 DIRS, 13 FILES")).toBeVisible();

    await expect(page.getByRole("button", { name: "F8 Profile" })).toBeVisible();
    await expect(page.getByRole("button", { name: "F9 Logoff" })).toBeVisible();
    await expect(page.getByText("ada", { exact: true })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.keyboard.press("F8");
    await expect(page).toHaveURL("/profile");
  });

  test("member routes send members to the profile", async ({ page }) => {
    await logon(page);

    await page.goto("/login");
    await expect(page).toHaveURL("/profile");

    await page.goto("/apply");
    await expect(page).toHaveURL("/profile");
  });

  test("F9 asks for confirmation and works by keyboard alone", async ({ page }) => {
    await logon(page);

    await page.keyboard.press("F9");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("End the session?")).toBeVisible();
    await expectNoViolations(page, "logoff confirmation");

    // The first action is focused; arrows cycle through the actions.
    const confirm = page.getByRole("button", { name: "[ LOG OFF ]" });
    const cancel = page.getByRole("button", { name: "[ CANCEL ]" });
    await expect(confirm).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(cancel).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(cancel).toBeFocused();

    // Cancel keeps the session and the page.
    await page.keyboard.press(" ");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL("/profile");
    await expect(page.getByRole("button", { name: "F9 Logoff" })).toBeVisible();

    await page.keyboard.press("F9");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL("/");

    await expect(page.getByRole("button", { name: "F9 Logon" })).toBeVisible();
    await expect(page.getByText("GUEST", { exact: true })).toBeVisible();
    const files = page.getByRole("region", { name: FILES_REGION });
    await expect(files.getByText("3 DIRS, 12 FILES")).toBeVisible();

    // The cursor lands on the displayed document (ABOUT), not on the first row:
    // one ArrowDown step from ABOUT reaches MANIFESTO.
    await files.locator("#file-ABOUT").focus();
    await expect(files.locator("#file-ABOUT")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(files.locator("#file-MANIFESTO")).toBeFocused();
  });

  test("has no accessibility violations on member pages", async ({ page }) => {
    await logon(page);
    for (const path of ["/profile", "/settings"]) {
      await page.goto(path);
      await expectNoViolations(page, path);
    }
  });
});

test.describe("apply form", () => {
  test("validates and shows a receipt", async ({ page }) => {
    await page.goto("/apply");

    await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
    await expect(page.getByText("2-32 characters: letters, digits, - or _.")).toBeVisible();
    await expect(page.getByText("An email address is needed.")).toBeVisible();
    await expect(page.getByText("A few words, at least.")).toBeVisible();

    await page.getByLabel("Role").click();
    await page.getByRole("option", { name: "Reviewer" }).click();
    await page.getByLabel("Hours a week").click();
    await page.getByRole("option", { name: "Over 10" }).click();

    await page.getByLabel(USER_LABEL).fill("grace-hopper");
    await page.getByLabel("Email").fill("grace@example.com");
    await page.getByLabel("Why by hand").fill("A compiler is a conversation.");
    await page.getByRole("button", { name: SUBMIT_BUTTON }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "APPLICATION RECEIVED" }),
    ).toBeVisible();
    await expect(page.getByText("APPLICANT: grace-hopper")).toBeVisible();
  });

  test("dropdowns work from the keyboard", async ({ page }) => {
    await page.goto("/apply");
    const role = page.getByLabel("Role");
    await role.focus();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("option", { name: "Learner" })).toBeVisible();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(role).toContainText("Reviewer");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Escape");
    await expect(role).toContainText("Reviewer");
    await expect(page.getByRole("listbox")).toHaveCount(0);
  });

  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/apply");
    await expectNoViolations(page, "/apply");

    await page.getByLabel("Role").click();
    await expect(page.getByRole("option", { name: "Learner" })).toBeVisible();
    await expectNoViolations(page, "/apply with an open dropdown");
    await page.keyboard.press("Escape");
  });
});

test.describe("social logon", () => {
  test("logs in with Google and logs off", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "[ GOOGLE ]" }).click();
    await expect(page).toHaveURL("/profile");
    await expect(page.getByRole("heading", { level: 1, name: "ada" })).toBeVisible();

    await page.keyboard.press("F9");
    await page.getByRole("button", { name: "[ LOG OFF ]" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: "F9 Logon" })).toBeVisible();
  });

  test("maps GitHub to its own demo user", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "[ GITHUB ]" }).click();
    await expect(page).toHaveURL("/profile");
    await expect(page.getByRole("heading", { level: 1, name: "grace" })).toBeVisible();
  });

  test("has no accessibility violations on the logon page", async ({ page }) => {
    await page.goto("/login");
    await expectNoViolations(page, "/login");
  });
});

test.describe("screensaver settings", () => {
  test("apply only after SAVE and persist on this terminal", async ({ page }) => {
    await logon(page);
    await page.goto("/settings");

    const toggle = page.getByRole("checkbox", { name: "Starfield after idle" });
    const delay = page.getByLabel("Idle delay");
    const save = page.getByRole("button", { name: "[ SAVE ]" });
    await expect(toggle).toBeChecked();
    await expect(delay).toContainText("5 MINUTES");
    await expect(save).toBeDisabled();

    await toggle.uncheck();
    await delay.click();
    await page.getByRole("option", { name: "1 MINUTE" }).click();
    await expect(save).toBeEnabled();

    // Edits stay in the form until SAVE is pressed.
    const stored = () =>
      page.evaluate((key) => localStorage.getItem(key), SCREENSAVER_PREFS_STORAGE_KEY);
    expect(await stored()).toBeNull();

    await save.click();
    await expect(page.getByText("Saved on this terminal.")).toBeVisible();
    await expect(save).toBeDisabled();
    await expect.poll(stored).toBe('{"enabled":false,"delayMinutes":1}');

    await page.reload();
    await expect(toggle).not.toBeChecked();
    await expect(delay).toContainText("1 MINUTE");
  });

  test("a disabled screensaver never appears", async ({ page }) => {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
      SCREENSAVER_PREFS_STORAGE_KEY,
      '{"enabled":false,"delayMinutes":30}',
    ] as const);
    await page.clock.install();
    await page.goto("/");
    await skipBootAsGuest(page);

    await page.clock.runFor(LONG_DELAY_MS + MINUTE_MS);
    await expect(page.getByRole("img", { name: "Starfield screensaver" })).toHaveCount(0);
  });

  test("a one minute delay brings the screensaver back", async ({ page }) => {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
      SCREENSAVER_PREFS_STORAGE_KEY,
      '{"enabled":true,"delayMinutes":1}',
    ] as const);
    await page.clock.install();
    await page.goto("/");
    await skipBootAsGuest(page);

    await page.clock.runFor(MINUTE_MS + 1_000);
    await expect(page.getByRole("img", { name: "Starfield screensaver" })).toBeVisible();
  });
});
