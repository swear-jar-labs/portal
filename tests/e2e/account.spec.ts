import { expect, test, type Page } from "@playwright/test";
import { DOS_SURFACE_ATTR, DOS_ZONE_ATTR } from "@swearjar/dos/contracts";
import { SCREENSAVER_PREFS_STORAGE_KEY } from "../../src/features/shell/screensaver-prefs";
import { screensaverDelayMs } from "../../src/content/settings";
import {
  docScroll,
  enterShell,
  expectMinimumContrast,
  expectNoViolations,
  logon,
  repeatKey,
  waitForHydration,
} from "./helpers";

const FILES_REGION = "C:\\SWEARJAR";
const USER_LABEL = "Username";
const PASSWORD_LABEL = "Password";
const SUBMIT_BUTTON = "[ SUBMIT ]";
const LONG_DELAY_MS = screensaverDelayMs(30);
const MINUTE_MS = 60_000;

async function skipBootAsGuest(page: Page) {
  await page.clock.runFor(300);
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();

  await expect(page.getByRole("menubar")).toBeVisible();
}

test.describe("guest account chrome", () => {
  test("shows register and logon only", async ({ page }) => {
    await enterShell(page);
    const files = page.getByRole("region", { name: FILES_REGION });

    await expect(files.getByRole("link", { name: "REGISTER" })).toBeVisible();
    await expect(files.getByRole("link", { name: "LOGON" })).toBeVisible();
    await expect(files.getByRole("link", { name: "APPLY" })).toHaveCount(0);
    await expect(files.getByRole("link", { name: "PROFILE" })).toHaveCount(0);
    await expect(files.getByRole("link", { name: "SETTINGS" })).toHaveCount(0);
    await expect(files.getByRole("button", { name: "LOGOFF" })).toHaveCount(0);
    await expect(files.getByText("3 DIRS, 11 FILES")).toBeVisible();

    await expect(page.getByRole("button", { name: "F8 Register" })).toBeVisible();
    await expect(page.getByRole("button", { name: "F9 Logon" })).toBeVisible();
    await expect(page.getByText("GUEST", { exact: true })).toBeVisible();

    await page.keyboard.press("F8");
    await expect(page).toHaveURL("/register");
  });

  test("gates member routes instead of opening them", async ({ page }) => {
    await page.goto("/profile");
    const gate = page.getByRole("region", { name: "PROFILE.EXE" });
    await expect(page.getByRole("heading", { level: 1, name: "LOGON REQUIRED" })).toBeVisible();
    await expect(gate.getByRole("link", { name: "LOGON" })).toBeVisible();
    await expect(gate.getByRole("link", { name: "REGISTER" })).toHaveAttribute("href", "/register");
    await expectNoViolations(page, "/profile gate");

    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1, name: "LOGON REQUIRED" })).toBeVisible();
  });
});

test.describe("member session", () => {
  test("logon lands on the forum and skips the guest welcome", async ({ page }) => {
    await logon(page);
    await expect(page.getByRole("region", { name: "FORUM.EXE" })).toBeVisible();

    await page.goto("/profile");
    await expect(page.getByRole("heading", { level: 1, name: "ada" })).toBeVisible();

    // The Google demo user carries a picture; the letter square stays the fallback.
    // Rows repeat the picture per thread, so the header owns the assertion.
    await expect(page.locator('img[src="/avatars/ada.png"]').first()).toBeVisible();

    await page.goto("/forum");
    await expect(page.getByRole("region", { name: "FORUM.EXE" })).toBeVisible();

    const files = page.getByRole("region", { name: FILES_REGION });
    await expect(files.getByRole("link", { name: "PROFILE" })).toBeVisible();
    await expect(files.getByRole("link", { name: "SETTINGS" })).toBeVisible();
    await expect(files.getByRole("button", { name: "LOGOFF" })).toBeVisible();
    await expect(files.getByRole("link", { name: "APPLY" })).toHaveCount(0);
    await expect(files.getByText("3 DIRS, 12 FILES")).toBeVisible();

    await expect(page.getByRole("button", { name: "F8 Profile" })).toBeVisible();
    await expect(page.getByRole("button", { name: "F9 Logoff" })).toBeVisible();
    await expect(
      page.getByRole("toolbar", { name: "Function keys" }).getByText("ada", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.keyboard.press("F8");
    await expect(page).toHaveURL("/profile");
  });

  test("guest-only routes send members to their home sections", async ({ page }) => {
    await logon(page);

    await page.goto("/login");
    await expect(page).toHaveURL("/forum");

    await page.goto("/apply");
    await expect(page).toHaveURL("/profile");
  });

  test("opens the forum for a signed-in member without a destination", async ({ page }) => {
    await logon(page);
    await page.goto("/profile");
    await expect(page).toHaveURL("/profile");

    await page.goto("/");
    await expect(page).toHaveURL("/forum");
    await waitForHydration(page);
    await expect(page.getByRole("region", { name: "FORUM.EXE" })).toBeVisible();
  });

  test("opens guide documents in place without bouncing to the forum", async ({ page }) => {
    await logon(page);
    await page.goto("/forum");

    await page.locator("#file-MANIFESTO").click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 2, name: "MANIFESTO.TXT" })).toBeVisible();
    await expect(page.locator("#file-MANIFESTO")).toHaveAttribute("aria-current", "true");
  });

  test("a logon started on a page returns there instead of the forum", async ({ page }) => {
    await page.goto("/tickets/FLAG-1");
    await waitForHydration(page);
    await page.locator("#file-LOGON").click();
    await expect(page).toHaveURL("/login?next=%2Ftickets%2FFLAG-1");

    await page.getByLabel(USER_LABEL).fill("ada");
    await page.getByLabel(PASSWORD_LABEL).fill("secret");
    await page.getByRole("button", { name: "[ LOG ON ]" }).click();
    await expect(page).toHaveURL("/tickets/FLAG-1");
  });

  test("F9 asks for confirmation and works by keyboard alone", async ({ page }) => {
    await logon(page);

    await page.keyboard.press("F9");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("End the session?")).toBeVisible();
    await expectNoViolations(page, "logoff confirmation");

    // The first action is focused; all four arrows cycle through the actions.
    const confirm = page.getByRole("button", { name: "[ LOG OFF ]" });
    const cancel = page.getByRole("button", { name: "[ CANCEL ]" });
    await expect(confirm).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(cancel).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(cancel).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(cancel).toBeFocused();

    // Cancel keeps the session and the page.
    await page.keyboard.press(" ");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL("/forum");
    await expect(page.getByRole("button", { name: "F9 Logoff" })).toBeVisible();

    await page.keyboard.press("F9");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL("/");

    await expect(page.getByRole("button", { name: "F9 Logon" })).toBeVisible();
    await expect(page.getByText("GUEST", { exact: true })).toBeVisible();
    const files = page.getByRole("region", { name: FILES_REGION });
    await expect(files.getByText("3 DIRS, 11 FILES")).toBeVisible();

    // The cursor lands on the displayed document (ABOUT), not on the first row:
    // one ArrowDown step from ABOUT reaches HOW-IT-WORKS.
    await files.locator("#file-ABOUT").focus();
    await expect(files.locator("#file-ABOUT")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(files.locator("#file-HOW")).toBeFocused();
  });

  test("has no accessibility violations on member pages", async ({ page }) => {
    await logon(page);
    for (const path of ["/profile", "/settings"]) {
      await page.goto(path);
      await expectNoViolations(page, path);
    }
  });

  test("settings controls walk with the plain arrows and keep the disabled SAVE visible", async ({
    page,
  }) => {
    await logon(page);
    await page.goto("/settings");

    const save = page.getByRole("button", { name: "[ SAVE ]" });
    const toggle = page.getByRole("checkbox", { name: "Starfield after idle" });
    const delay = page.getByLabel("Idle delay");

    // A disabled button keeps a body of its own: darker than the light window.
    const colors = await save.evaluate(
      (element, zoneAttr) => ({
        button: getComputedStyle(element).backgroundColor,
        panel: getComputedStyle(element.closest(`[${zoneAttr}]`) ?? element).backgroundColor,
      }),
      DOS_ZONE_ATTR,
    );
    expect(colors.button).toBe("rgb(85, 85, 85)");
    expect(colors.button).not.toBe(colors.panel);

    await page.locator("#file-SETTINGS").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("ArrowDown");
    await expect(toggle).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(delay).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(toggle).toBeFocused();
  });
});

test.describe("registration and levels", () => {
  test("registers a guest by email code and lands on the profile", async ({ page }) => {
    await enterShell(page);
    const files = page.getByRole("region", { name: FILES_REGION });
    await files.getByRole("link", { name: "REGISTER" }).click();
    await expect(page).toHaveURL("/register");

    // The mock registry outlives a single run (reused dev server), so the
    // handle carries a timestamp instead of colliding with earlier runs.
    const handle = `quinn-${Date.now().toString(36)}`;
    const form = page.getByRole("form", { name: "REGISTER" });
    await form.getByLabel(USER_LABEL).fill(handle);
    await form.getByLabel("Email").fill(`${handle}@example.com`);
    await form.getByLabel(PASSWORD_LABEL).fill("secret");
    await form.getByRole("button", { name: "[ REGISTER ]" }).click();

    await expect(form.getByRole("heading", { name: "CHECK YOUR EMAIL" })).toBeVisible();
    // No mail leaves the demo: the issued code is shown on screen, and the
    // step takes the keyboard for immediate typing.
    const codeField = form.getByLabel("Email code");
    await expect(codeField).toBeFocused();
    const demoCode = await form.getByText("Demo code:").evaluate((element) => {
      const match = /([0-9]{6})/.exec(element.textContent ?? "");
      if (!match?.[1]) throw new Error("the demo code is not shown");
      return match[1];
    });
    await expectNoViolations(page, "/register code step");

    await codeField.fill(demoCode);
    await form.getByRole("button", { name: "[ CONFIRM ]" }).click();

    await expect(page).toHaveURL("/profile");
    const profile = page.getByRole("region", { name: "PROFILE.EXE" });
    await expect(profile.getByRole("heading", { level: 1, name: handle })).toBeVisible();
    await expect(profile.getByText("Participant")).toBeVisible();
    await expect(profile.getByRole("img")).toHaveCount(0);
    await expectNoViolations(page, "fresh participant profile");
  });

  test("rejects a wrong email code without creating the account", async ({ page }) => {
    await page.goto("/register");
    const handle = `quinn-wrong-${Date.now().toString(36)}`;
    const form = page.getByRole("form", { name: "REGISTER" });
    await form.getByLabel(USER_LABEL).fill(handle);
    await form.getByLabel("Email").fill(`${handle}@example.com`);
    await form.getByLabel(PASSWORD_LABEL).fill("secret");
    await form.getByRole("button", { name: "[ REGISTER ]" }).click();

    await expect(form.getByRole("heading", { name: "CHECK YOUR EMAIL" })).toBeVisible();
    const demoCode = await form.getByText("Demo code:").evaluate((element) => {
      const match = /([0-9]{6})/.exec(element.textContent ?? "");
      if (!match?.[1]) throw new Error("the demo code is not shown");
      return match[1];
    });
    const wrong = demoCode.startsWith("0") ? `1${demoCode.slice(1)}` : `0${demoCode.slice(1)}`;
    await form.getByLabel("Email code").fill(wrong);
    await form.getByRole("button", { name: "[ CONFIRM ]" }).click();

    await expect(form.getByText("Wrong code. Check the demo code and try again.")).toBeVisible();
    await expect(page).toHaveURL("/register");

    // Back to the details keeps the typed mailbox for a quick fix.
    await form.getByRole("button", { name: "[ BACK ]" }).click();
    await expect(form.getByLabel("Email")).toHaveValue(`${handle}@example.com`);

    // The retry reissues the code; the fresh one still lands the account.
    await form.getByRole("button", { name: "[ REGISTER ]" }).click();
    await expect(form.getByRole("heading", { name: "CHECK YOUR EMAIL" })).toBeVisible();
    const retryCode = await form.getByText("Demo code:").evaluate((element) => {
      const match = /([0-9]{6})/.exec(element.textContent ?? "");
      if (!match?.[1]) throw new Error("the demo code is not shown");
      return match[1];
    });
    await form.getByLabel("Email code").fill(retryCode);
    await form.getByRole("button", { name: "[ CONFIRM ]" }).click();
    await expect(page).toHaveURL("/profile");
  });

  test("registers fresh participants through the social buttons", async ({ page }) => {
    await page.goto("/register");
    const form = page.getByRole("form", { name: "REGISTER" });

    await form.getByRole("button", { name: "[ GOOGLE ]" }).click();
    await expect(page).toHaveURL("/profile");
    const profile = page.getByRole("region", { name: "PROFILE.EXE" });
    await expect(profile.getByRole("heading", { level: 1, name: "google-newcomer" })).toBeVisible();
    await expect(profile.getByText("Participant")).toBeVisible();

    await page.keyboard.press("F9");
    await page.getByRole("button", { name: "[ LOG OFF ]" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/register");
    await page
      .getByRole("form", { name: "REGISTER" })
      .getByRole("button", { name: "[ GITHUB ]" })
      .click();
    await expect(page).toHaveURL("/profile");
    const second = page.getByRole("region", { name: "PROFILE.EXE" });
    await expect(second.getByRole("heading", { level: 1, name: "github-newcomer" })).toBeVisible();
    await expect(second.getByText("Participant")).toBeVisible();
  });

  test("shows apply to participants only", async ({ page }) => {
    await logon(page, "quinn-sees-apply");
    const files = page.getByRole("region", { name: FILES_REGION });
    await expect(files.getByRole("link", { name: "APPLY" })).toBeVisible();
    await expect(files.getByText("3 DIRS, 13 FILES")).toBeVisible();

    await page.getByRole("menuitem", { name: "Account" }).click();
    await expect(page.getByRole("menu").getByRole("menuitem", { name: "Apply..." })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.keyboard.press("F9");
    await page.getByRole("button", { name: "[ LOG OFF ]" }).click();
    await expect(page).toHaveURL("/");

    await logon(page);
    await expect(files.getByRole("link", { name: "APPLY" })).toHaveCount(0);
    await expect(files.getByText("3 DIRS, 12 FILES")).toBeVisible();
  });

  test("provisions an unknown logon as a participant", async ({ page }) => {
    await logon(page, "quinn-provision");
    await page.goto("/profile");
    const profile = page.getByRole("region", { name: "PROFILE.EXE" });
    await expect(profile.getByRole("heading", { level: 1, name: "quinn-provision" })).toBeVisible();
    await expect(profile.getByText("Participant")).toBeVisible();
  });

  test("switching actors keeps their levels", async ({ page }) => {
    await logon(page, "quinn-switch");
    await page.goto("/profile");
    await expect(
      page.getByRole("region", { name: "PROFILE.EXE" }).getByText("Participant"),
    ).toBeVisible();

    await page.keyboard.press("F9");
    await page.getByRole("button", { name: "[ LOG OFF ]" }).click();
    await expect(page).toHaveURL("/");

    await logon(page);
    await page.goto("/profile");
    const profile = page.getByRole("region", { name: "PROFILE.EXE" });
    await expect(profile.getByRole("heading", { level: 1, name: "ada" })).toBeVisible();
    await expect(profile.getByText("Member")).toBeVisible();

    await page.keyboard.press("F9");
    await page.getByRole("button", { name: "[ LOG OFF ]" }).click();
    await expect(page).toHaveURL("/");

    await logon(page, "quinn-switch");
    await page.goto("/profile");
    await expect(
      page.getByRole("region", { name: "PROFILE.EXE" }).getByText("Participant"),
    ).toBeVisible();
  });

  test("rejects taken handles, taken emails and validates the form", async ({ page }) => {
    await page.goto("/register");
    const form = page.getByRole("form", { name: "REGISTER" });

    await form.getByRole("button", { name: "[ REGISTER ]" }).click();
    await expect(form.getByText("2-32 characters: letters, digits, - or _.")).toBeVisible();
    await expect(form.getByText("Enter a valid email address.")).toBeVisible();
    await expect(form.getByText("A password is needed.")).toBeVisible();
    await expect(page).toHaveURL("/register");

    await form.getByLabel(USER_LABEL).fill("ada");
    await form.getByLabel("Email").fill("ada@example.com");
    await form.getByLabel(PASSWORD_LABEL).fill("secret");
    await form.getByRole("button", { name: "[ REGISTER ]" }).click();
    await expect(
      form.getByText("That username is taken. Pick another one, or log on."),
    ).toBeVisible();
    await expect(page).toHaveURL("/register");

    // Register one handle, then reuse its mailbox for another.
    const first = `quinn-mail-${Date.now().toString(36)}`;
    const mailbox = `${first}@example.com`;
    await form.getByLabel(USER_LABEL).fill(first);
    await form.getByLabel("Email").fill(mailbox);
    await form.getByRole("button", { name: "[ REGISTER ]" }).click();
    await expect(form.getByRole("heading", { name: "CHECK YOUR EMAIL" })).toBeVisible();
    const demoCode = await form.getByText("Demo code:").evaluate((element) => {
      const match = /([0-9]{6})/.exec(element.textContent ?? "");
      if (!match?.[1]) throw new Error("the demo code is not shown");
      return match[1];
    });
    await form.getByLabel("Email code").fill(demoCode);
    await form.getByRole("button", { name: "[ CONFIRM ]" }).click();
    await expect(page).toHaveURL("/profile");

    await page.keyboard.press("F9");
    await page.getByRole("button", { name: "[ LOG OFF ]" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/register");
    const retry = page.getByRole("form", { name: "REGISTER" });
    await retry.getByLabel(USER_LABEL).fill(`quinn-mail-2-${Date.now().toString(36)}`);
    await retry.getByLabel("Email").fill(mailbox);
    await retry.getByLabel(PASSWORD_LABEL).fill("secret");
    await retry.getByRole("button", { name: "[ REGISTER ]" }).click();
    await expect(
      retry.getByText("That email is already registered. Log on instead."),
    ).toBeVisible();
    await expect(page).toHaveURL("/register");
  });

  test("marks the admin demo on the profile", async ({ page }) => {
    await logon(page, "admin");
    await page.goto("/profile");
    const profile = page.getByRole("region", { name: "PROFILE.EXE" });
    await expect(profile.getByRole("heading", { level: 1, name: "admin" })).toBeVisible();
    await expect(profile.getByText("Member")).toBeVisible();
    await expect(profile.getByText("JOINED")).toContainText("ADMIN");
  });

  test("opens apply for participants and bounces members to the profile", async ({ page }) => {
    await page.goto("/apply");
    await expect(page).toHaveURL("/register");

    await logon(page, "quinn-apply");
    await page.goto("/apply");
    await expect(page.getByRole("heading", { level: 1, name: "MEMBER APPLICATION" })).toBeVisible();

    await page.keyboard.press("F9");
    await page.getByRole("button", { name: "[ LOG OFF ]" }).click();
    await expect(page).toHaveURL("/");

    await logon(page);
    await page.goto("/apply");
    await expect(page).toHaveURL("/profile");
  });

  test("sends members from the register route to the profile", async ({ page }) => {
    await logon(page);
    await page.goto("/register");
    await expect(page).toHaveURL("/profile");
  });

  test("walks the register form by keyboard with no violations", async ({ page }) => {
    await page.goto("/register");
    const form = page.getByRole("form", { name: "REGISTER" });
    const user = form.getByLabel(USER_LABEL);
    const email = form.getByLabel("Email");
    const password = form.getByLabel(PASSWORD_LABEL);

    await page.locator("#file-REGISTER").focus();
    await page.keyboard.press("Tab");
    await expect(docScroll(page)).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(email).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(user).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(password).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(user).toBeFocused();

    await expectNoViolations(page, "/register");

    const handle = `quinn-keys-${Date.now().toString(36)}`;
    await user.fill(handle);
    await email.fill(`${handle}@example.com`);
    await password.fill("secret");
    await form.getByRole("button", { name: "[ REGISTER ]" }).click();

    const code = form.getByLabel("Email code");
    await expect(code).toBeVisible();
    await code.focus();
    await page.keyboard.type("000000");
    await expect(code).toHaveValue("000000");
    await expectNoViolations(page, "/register code step");
  });
});

test.describe("member threads", () => {
  test("lists the member's threads and opens one with a click or Space", async ({ page }) => {
    await logon(page);
    await page.goto("/profile");
    await waitForHydration(page);

    const profile = page.getByRole("region", { name: "PROFILE.EXE" });
    await expect(profile.getByRole("heading", { level: 2, name: "MY THREADS" })).toBeVisible();
    await expect(
      profile.getByRole("link", { name: "CI cache poisoning: how we lost a day" }),
    ).toBeVisible();
    await expect(
      profile.getByRole("link", { name: "READ FIRST: how this board works" }),
    ).toBeVisible();

    // A window marker survives a soft navigation; a full load would wipe it.
    await page.evaluate(() => {
      (window as unknown as { sjSpaMarker?: number }).sjSpaMarker = 1;
    });
    await profile.getByRole("link", { name: "CI cache poisoning: how we lost a day" }).click();
    await expect(page).toHaveURL("/forum/ci-cache-poisoning");
    await expect(
      page.getByRole("region", { name: "CI cache poisoning: how we lost a day" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => (window as unknown as { sjSpaMarker?: number }).sjSpaMarker),
    ).toBe(1);

    // Space activates a focused row (Enter is the native link activation).
    await page.goBack();
    await expect(page).toHaveURL("/profile");
    const row = page.getByRole("link", { name: "READ FIRST: how this board works" });
    await row.focus();
    await page.keyboard.press(" ");
    await expect(page).toHaveURL("/forum/read-first");
  });

  test("closes a thread back to the profile that pushed it", async ({ page }) => {
    await logon(page);
    await page.goto("/profile");

    const profile = page.getByRole("region", { name: "PROFILE.EXE" });
    await profile.getByRole("link", { name: "READ FIRST: how this board works" }).click();
    await expect(page).toHaveURL("/forum/read-first");
    await expect(
      page.getByRole("region", { name: "READ FIRST: how this board works" }),
    ).toBeVisible();

    // The profile's push is the one history entry behind the thread: a close
    // returns to the profile, not to the feed (the memory of the last push
    // must include the member's rows, not only the feed's cards).
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL("/profile");
    await expect(profile.getByRole("heading", { level: 2, name: "MY THREADS" })).toBeVisible();
  });

  test("shows the empty state for a member without threads", async ({ page }) => {
    await logon(page, "nobody");
    await page.goto("/profile");
    await expect(page.getByText("No threads yet. A question is a good start.")).toBeVisible();
  });
});

test.describe("apply form", () => {
  test("validates and submits a member application", async ({ page }) => {
    const handle = `quinn-form-${Date.now().toString(36)}`;
    await logon(page, handle);
    await page.goto("/apply");
    await expect(
      page.getByText(
        "Demo applications stay in this server process. No message is sent outside this build.",
      ),
    ).toBeVisible();
    await expect(page.getByText(`APPLICANT: ${handle}`)).toBeVisible();
    await expect(page.getByLabel(USER_LABEL)).toHaveCount(0);
    await expect(page.getByLabel("Email")).toHaveCount(0);

    await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
    await expect(
      page.getByText("Tell us a little about your plans, up to 2000 characters."),
    ).toBeVisible();

    await page.getByLabel("Hours a week").click();
    await page.getByRole("option", { name: "Over 10" }).click();

    await page
      .getByLabel("What would you like to work on or learn?")
      .fill("A compiler is a conversation.");
    await page.getByRole("button", { name: SUBMIT_BUTTON }).click();

    await expect(page.getByText("Your application is in the admin queue.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "APPLICATION HISTORY" })).toBeVisible();
    await expect(page.getByText(/member-\d/)).toHaveCount(0);
    await expect(page.getByText(`APPLICANT: ${handle}`)).toBeVisible();
    await expectNoViolations(page, "submitted member application");
  });

  test("weekly hours dropdown works from the keyboard", async ({ page }) => {
    await logon(page, "quinn-hours");
    await page.goto("/apply");
    const hours = page.getByLabel("Hours a week");
    await hours.focus();

    // Plain ↑/↓ walk controls instead of opening the list.
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(page.getByLabel("What you have built or broken")).toBeFocused();

    await hours.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("option", { name: "5 to 10" })).toBeVisible();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(hours).toContainText("Over 10");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    await hours.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Escape");
    await expect(hours).toContainText("Over 10");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    // Tab from an open list commits the active option and toggles panels.
    await hours.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("ArrowUp");
    await expect(page.getByRole("option", { name: "5 to 10" })).toHaveAttribute(
      "data-active",
      "true",
    );
    await page.keyboard.press("Tab");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(hours).toContainText("5 to 10");
    await expect(hours).not.toBeFocused();
  });

  test("typing on a closed dropdown opens it at the match without feeding the command line", async ({
    page,
  }) => {
    await logon(page, "quinn-hours-type");
    await page.goto("/apply");
    const hours = page.getByLabel("Hours a week");
    await hours.focus();
    await expect(hours).toContainText("5 to 10");

    await page.keyboard.type("o");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("option", { name: "Over 10" })).toHaveAttribute(
      "data-active",
      "true",
    );
    // The global print capture must not steal the letter.
    await expect(page.getByLabel("Command line")).toHaveValue("");

    await page.keyboard.press("Enter");
    await expect(hours).toContainText("Over 10");
  });

  test("a textarea keeps its caret and only arrows out from its edges", async ({ page }) => {
    await logon(page, "quinn-caret");
    await page.goto("/apply");
    const message = page.getByLabel("What would you like to work on or learn?");
    const experience = page.getByLabel("What you have built or broken");
    const submit = page.getByRole("button", { name: SUBMIT_BUTTON });

    const text = "A compiler is a conversation.\nGravity is optional.";
    await message.fill(text);

    // The caret is placed by position so the edge checks are deterministic.
    const caretAt = (offset: number) =>
      message.evaluate((element, value) => {
        if (!(element instanceof HTMLTextAreaElement)) return;
        element.focus();
        element.setSelectionRange(value, value);
      }, offset);

    // Not at the start: ↑ moves the caret, focus stays; Shift+↑ selects.
    await caretAt(text.length);
    await page.keyboard.press("ArrowUp");
    await expect(message).toBeFocused();
    await page.keyboard.press("Shift+ArrowUp");
    const selected = await message.evaluate((element) => {
      if (!(element instanceof HTMLTextAreaElement)) return false;
      return element.selectionStart !== element.selectionEnd;
    });
    expect(selected).toBe(true);
    await expect(message).toBeFocused();

    // At the start: ↑ leaves to the previous control.
    await caretAt(0);
    await page.keyboard.press("ArrowUp");
    await expect(experience).toBeFocused();

    // At the end: ↓ leaves to the next control.
    await caretAt(text.length);
    await page.keyboard.press("ArrowDown");
    await expect(submit).toBeFocused();

    // Not at the end: ↓ keeps the caret in the field.
    await caretAt(0);
    await page.keyboard.press("ArrowDown");
    await expect(message).toBeFocused();

    // A held ↓ repeats the same guard: the caret keeps the repeat.
    await repeatKey(page, "ArrowDown");
    await expect(message).toBeFocused();
  });

  test("Enter keeps the newline and Shift+Enter sends the form", async ({ page }) => {
    await logon(page, `quinn-newline-${Date.now().toString(36)}`);
    await page.goto("/apply");
    const message = page.getByLabel("What would you like to work on or learn?");

    await message.click();
    await page.keyboard.type("first");
    await page.keyboard.press("Enter");
    await page.keyboard.type("second");
    await expect(message).toHaveValue("first\nsecond");
    await expect(page.getByRole("heading", { name: "MEMBER APPLICATION" })).toBeVisible();

    await page.keyboard.press("Shift+Enter");
    await expect(page.getByText("Your application is in the admin queue.")).toBeVisible();
  });

  test("Shift + arrows scroll an overflowing window", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 420 });
    await logon(page, "quinn-scroll");
    await page.goto("/apply");
    const body = docScroll(page);
    const scrollTop = () => body.evaluate((element) => element.scrollTop);

    await expect
      .poll(() => body.evaluate((element) => element.scrollHeight))
      .toBeGreaterThan(await body.evaluate((element) => element.clientHeight));
    expect(await scrollTop()).toBe(0);

    // From a non-text control the arrows scroll instead of walking.
    await page.getByLabel("Hours a week").focus();
    await page.keyboard.press("Shift+ArrowDown");
    const scrolled = await scrollTop();
    expect(scrolled).toBeGreaterThan(0);
    await page.keyboard.press("Shift+ArrowUp");
    expect(await scrollTop()).toBeLessThan(scrolled);
    await expect(page.getByLabel("Hours a week")).toBeFocused();

    // A textarea keeps Shift+↑ for selection: the window stays put.
    const message = page.getByLabel("What would you like to work on or learn?");
    await message.click();
    const before = await scrollTop();
    await page.keyboard.press("Shift+ArrowUp");
    expect(await scrollTop()).toBe(before);
  });

  test("has no accessibility violations", async ({ page }) => {
    await logon(page, "quinn-axe");
    await page.goto("/apply");
    await expectNoViolations(page, "/apply");

    await page.getByLabel("Hours a week").click();
    await expect(page.getByRole("option", { name: "Under 5" })).toBeVisible();
    await expectNoViolations(page, "/apply with an open dropdown");
    await page.keyboard.press("Escape");
  });
});

test.describe("member application workflow", () => {
  async function logoff(page: Page) {
    await page.getByRole("button", { name: "F9 Logoff" }).click();
    await page.getByRole("button", { name: "[ LOG OFF ]" }).click();
    await expect(page).toHaveURL("/");
  }

  test("keeps the server-rendered apply form disabled until hydration", async ({
    browser,
    page,
  }) => {
    await logon(page, `apply-cold-${Date.now().toString(36)}`);
    const context = await browser.newContext({
      javaScriptEnabled: false,
      storageState: await page.context().storageState(),
    });
    try {
      const coldPage = await context.newPage();
      await coldPage.goto("/apply");
      await expect(coldPage.getByRole("button", { name: SUBMIT_BUTTON })).toBeDisabled();
      await expect(coldPage).toHaveURL("/apply");
    } finally {
      await context.close();
    }
  });

  test("keeps a clarification in one application and grants Member on approval", async ({
    page,
  }) => {
    const applicant = `apply-flow-${Date.now().toString(36)}`;
    await logon(page, applicant);
    await page.goto("/apply");
    await waitForHydration(page);
    await page.getByLabel("What would you like to work on or learn?").fill("Work on parsers");
    await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
    await expect(page.getByText("Your application is in the admin queue.")).toBeVisible();
    await logoff(page);

    await logon(page, "admin");
    await page.goto("/admin");
    const review = page.getByRole("region", { name: applicant });
    await expect(review.getByText("Work on parsers")).toBeVisible();
    await expect(review.getByText(/member-\d/)).toHaveCount(0);
    await expectNoViolations(page, "/admin queue");
    await review.getByLabel("Reason or question").fill("Which parser have you built?");
    await review.getByRole("button", { name: "[ REQUEST DETAILS ]" }).focus();
    await page.keyboard.press("Enter");
    await expect(review.getByText("Waiting for the applicant's clarification.")).toBeVisible();
    await logoff(page);

    await logon(page, applicant);
    await page.goto("/apply");
    await waitForHydration(page);
    await expect(page.getByText("Which parser have you built?")).toBeVisible();
    await page.getByLabel("Your clarification").fill("An expression parser in TypeScript.");
    await page.getByRole("button", { name: "[ SEND REPLY ]" }).click();
    await expect(page.getByText("Your application is in the admin queue.")).toBeVisible();
    await logoff(page);

    await logon(page, "admin");
    await page.goto("/admin");
    await expect(review.getByText("An expression parser in TypeScript.")).toBeVisible();
    await review.getByRole("button", { name: "[ APPROVE ]" }).click();
    await expect(review.getByText("This application has a final decision.")).toBeVisible();
    await logoff(page);

    await logon(page, applicant);
    await page.goto("/profile");
    await expect(page.getByText("Member · JOINED")).toBeVisible();
    await expect(page.getByRole("heading", { name: "APPLICATION HISTORY" })).toBeVisible();
    await expect(page.getByText("Approved · admin")).toBeVisible();
    await expect(page.getByRole("link", { name: "APPLY" })).toHaveCount(0);
    await page.goto("/apply");
    await expect(page).toHaveURL("/profile");
  });

  test("denies the admin route to guests and ordinary accounts", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("Admin access is required to open this file.")).toBeVisible();
    await expect(page.getByRole("button", { name: "[ APPROVE ]" })).toHaveCount(0);
    await logon(page, `apply-denied-${Date.now().toString(36)}`);
    await page.goto("/admin");
    await expect(page.getByText("Admin access is required to open this file.")).toBeVisible();
    await expect(page.getByRole("link", { name: "ADMIN" })).toHaveCount(0);
    await logoff(page);
    await logon(page, "ada");
    await page.goto("/admin");
    await expect(page.getByText("Admin access is required to open this file.")).toBeVisible();
    await logoff(page);
    await logon(page, "coadmin");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "MEMBER APPLICATIONS" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ADMIN" })).toBeVisible();
  });

  test("preserves a rejection when the applicant reapplies", async ({ page }) => {
    const applicant = `apply-retry-${Date.now().toString(36)}`;
    await logon(page, applicant);
    await page.goto("/apply");
    await waitForHydration(page);
    await page.getByLabel("What would you like to work on or learn?").fill("First draft");
    await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
    await expect(page.getByText("Your application is in the admin queue.")).toBeVisible();
    await logoff(page);

    await logon(page, "admin");
    await page.goto("/admin");
    const review = page.getByRole("region", { name: applicant });
    await review.getByLabel("Reason or question").fill("Please give a concrete example.");
    await review.getByRole("button", { name: "[ DECLINE ]" }).click();
    await expect(review.getByText("This application has a final decision.")).toBeVisible();
    await logoff(page);

    await logon(page, applicant);
    await page.goto("/apply");
    await waitForHydration(page);
    await expect(page.getByText("Please give a concrete example.")).toBeVisible();
    await page.getByLabel("What would you like to work on or learn?").fill("A parser I built");
    await page.getByRole("button", { name: "[ APPLY AGAIN ]" }).click();
    await expect(page.getByText("Your application is in the admin queue.")).toBeVisible();
    await expect(page.getByText("First draft")).toBeVisible();
    await expect(page.getByText("A parser I built")).toBeVisible();

    await logoff(page);
    await logon(page, "admin");
    await page.goto("/admin");
    const attempts = page.getByRole("region", { name: applicant });
    await expect(attempts).toHaveCount(2);
    await expect(attempts.nth(0)).toContainText("A parser I built");
    await expect(attempts.nth(1)).toContainText("First draft");
  });
});

test.describe("social logon", () => {
  test("logs in with Google and logs off", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "[ GOOGLE ]" }).click();
    await expect(page).toHaveURL("/forum");
    await page.goto("/profile");
    await expect(page.getByRole("heading", { level: 1, name: "ada" })).toBeVisible();

    await page.keyboard.press("F9");
    await page.getByRole("button", { name: "[ LOG OFF ]" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: "F9 Logon" })).toBeVisible();
  });

  test("maps GitHub to its own demo user", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "[ GITHUB ]" }).click();
    await expect(page).toHaveURL("/forum");
    await page.goto("/profile");
    await expect(page.getByRole("heading", { level: 1, name: "grace" })).toBeVisible();
  });

  test("has no accessibility violations on the logon page", async ({ page }) => {
    await page.goto("/login");
    await expectNoViolations(page, "/login");
  });
});

test.describe("logon window", () => {
  test("Tab toggles the file list and the window, from its controls too", async ({ page }) => {
    await page.goto("/login");
    const doc = docScroll(page);
    const row = page.locator("#file-LOGON");
    const user = page.getByLabel(USER_LABEL);

    await row.focus();
    await page.keyboard.press("Tab");
    await expect(doc).toBeFocused();
    // The focused window marks its whole frame (title bar included), in the
    // surface's ring color — blue on a light form window.
    const outline = await doc.evaluate(
      (element) => getComputedStyle(element.parentElement ?? element).outline,
    );
    expect(outline).toContain("rgb(0, 0, 170)");

    // ↑/↓ walk the controls from the surface...
    await page.keyboard.press("ArrowDown");
    await expect(user).toBeFocused();

    // ...and Tab still toggles panels from a control (the user report).
    await page.keyboard.press("Tab");
    await expect(row).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(doc).toBeFocused();
  });

  test("plain arrows walk the form controls with wrap-around", async ({ page }) => {
    await page.goto("/login");
    const form = page.getByRole("form", { name: "LOGON" });
    await expect(
      form.getByText(
        "Development demo: use a made-up password. Google and GitHub buttons also simulate sign-in; no real accounts are connected.",
      ),
    ).toBeVisible();
    const user = page.getByLabel(USER_LABEL);
    const password = page.getByLabel(PASSWORD_LABEL);
    const register = form.getByRole("link", { name: "REGISTER" });

    // From the panel surface the walk enters at the matching edge.
    await page.locator("#file-LOGON").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("ArrowUp");
    await expect(register).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(user).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(password).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(user).toBeFocused();
  });

  test("plain left/right arrows walk a flat window and keep the caret in fields", async ({
    page,
  }) => {
    await page.goto("/login");
    const form = page.getByRole("form", { name: "LOGON" });
    const user = page.getByLabel(USER_LABEL);
    const logon = form.getByRole("button", { name: "[ LOG ON ]" });
    const google = form.getByRole("button", { name: "[ GOOGLE ]" });

    // The form stacks controls without row markup: a flat region walks ←/→
    // exactly like ↑/↓.
    await logon.focus();
    await page.keyboard.press("ArrowRight");
    await expect(google).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(logon).toBeFocused();

    // A text field keeps ←/→ for the caret: focus stays put.
    await user.focus();
    await page.keyboard.press("ArrowRight");
    await expect(user).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(user).toBeFocused();
  });

  test("a window without a scrollbar ignores Shift + arrows", async ({ page }) => {
    await page.goto("/login");
    const body = docScroll(page);
    const google = page.getByRole("button", { name: "[ GOOGLE ]" });

    await google.focus();
    await page.keyboard.press("Shift+ArrowDown");
    expect(await body.evaluate((element) => element.scrollTop)).toBe(0);
    await expect(google).toBeFocused();
  });

  test("the window [X] closes back to the default document", async ({ page }) => {
    for (const path of ["/login", "/apply", "/profile"]) {
      await page.goto(path);
      await page.getByRole("button", { name: "Close" }).click();
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("region", { name: "ABOUT.TXT" })).toBeVisible();
    }
  });

  test("secondary text keeps WCAG AA contrast on the light surfaces", async ({ page }) => {
    await page.goto("/login");
    await expectMinimumContrast(page.getByText("Usernames use letters"));
    await expectMinimumContrast(page.getByText("OR LOG ON WITH"));

    await page.goto("/no-such-route");
    const panel = page.getByRole("region", { name: "404.TXT" });
    await expect(panel).toHaveAttribute(DOS_SURFACE_ATTR, "paper");
    await expectMinimumContrast(page.getByText("This page could not be found"));
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
    await expect(page.getByText("Saved in this browser.")).toBeVisible();
    await expect(save).toBeDisabled();
    await expect.poll(stored).toBe('{"enabled":false,"delayMinutes":1}');

    await page.reload();
    await expect(toggle).not.toBeChecked();
    await expect(delay).toContainText("1 MINUTE");
  });

  test("Enter toggles the checkbox and Shift+Enter saves the form", async ({ page }) => {
    await logon(page);
    await page.goto("/settings");

    const toggle = page.getByRole("checkbox", { name: "Starfield after idle" });
    const save = page.getByRole("button", { name: "[ SAVE ]" });
    const stored = () =>
      page.evaluate((key) => localStorage.getItem(key), SCREENSAVER_PREFS_STORAGE_KEY);

    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).not.toBeChecked();
    await expect(save).toBeEnabled();

    await page.keyboard.press("Shift+Enter");
    await expect(page.getByText("Saved in this browser.")).toBeVisible();
    await expect(save).toBeDisabled();
    await expect.poll(stored).toBe('{"enabled":false,"delayMinutes":5}');

    // Space keeps toggling natively after the save.
    await page.keyboard.press(" ");
    await expect(toggle).toBeChecked();
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
