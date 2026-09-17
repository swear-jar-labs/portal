import { expect, test, type Page } from "@playwright/test";
import { DOS_SURFACE_ATTR, DOS_ZONE_ATTR } from "@swearjar/dos/contracts";
import { SCREENSAVER_PREFS_STORAGE_KEY } from "../../src/features/shell/screensaver-prefs";
import { screensaverDelayMs } from "../../src/content/settings";
import {
  docScroll,
  enterShell,
  expectMinimumContrast,
  expectNoViolations,
  repeatKey,
} from "./helpers";

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

    // The Google demo user carries a picture; the letter square stays the fallback.
    await expect(page.locator('img[src="/avatars/ada.svg"]')).toBeVisible();

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

test.describe("member threads", () => {
  test("lists the member's threads and opens one with a click or Space", async ({ page }) => {
    await logon(page);

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
    await expect(page).toHaveURL("/discussions/ci-cache-poisoning");
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
    await expect(page).toHaveURL("/discussions/read-first");
  });

  test("closes a thread back to the profile that pushed it", async ({ page }) => {
    await logon(page);

    const profile = page.getByRole("region", { name: "PROFILE.EXE" });
    await profile.getByRole("link", { name: "READ FIRST: how this board works" }).click();
    await expect(page).toHaveURL("/discussions/read-first");
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
    await expect(page.getByText("No threads yet. Say something by hand.")).toBeVisible();
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

    // Plain ↑/↓ walk controls instead of opening the list.
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(page.getByLabel(USER_LABEL)).toBeFocused();

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

    // Tab from an open list commits the active option and toggles panels.
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(role).toContainText("Learner");
    await expect(page.locator("#file-APPLY")).toBeFocused();
  });

  test("typing on a closed dropdown opens it at the match without feeding the command line", async ({
    page,
  }) => {
    await page.goto("/apply");
    const role = page.getByLabel("Role");
    await role.focus();
    await expect(role).toContainText("Learner");

    await page.keyboard.type("r");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("option", { name: "Reviewer" })).toHaveAttribute(
      "data-active",
      "true",
    );
    // The global print capture must not steal the letter.
    await expect(page.getByLabel("Command line")).toHaveValue("");

    await page.keyboard.press("Enter");
    await expect(role).toContainText("Reviewer");
  });

  test("a textarea keeps its caret and only arrows out from its edges", async ({ page }) => {
    await page.goto("/apply");
    const message = page.getByLabel("Why by hand");
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
    await page.goto("/apply");
    const message = page.getByLabel("Why by hand");

    await message.click();
    await page.keyboard.type("first");
    await page.keyboard.press("Enter");
    await page.keyboard.type("second");
    await expect(message).toHaveValue("first\nsecond");
    await expect(page.getByText("An email address is needed.")).toHaveCount(0);

    await page.keyboard.press("Shift+Enter");
    await expect(page.getByText("An email address is needed.")).toBeVisible();
  });

  test("Shift + arrows scroll an overflowing window", async ({ page }) => {
    await page.goto("/apply");
    const body = docScroll(page);
    const scrollTop = () => body.evaluate((element) => element.scrollTop);

    expect(await scrollTop()).toBe(0);

    // From a non-text control the arrows scroll instead of walking.
    await page.getByLabel("Role").focus();
    await page.keyboard.press("Shift+ArrowDown");
    const scrolled = await scrollTop();
    expect(scrolled).toBeGreaterThan(0);
    await page.keyboard.press("Shift+ArrowUp");
    expect(await scrollTop()).toBeLessThan(scrolled);
    await expect(page.getByLabel("Role")).toBeFocused();

    // A textarea keeps Shift+↑ for selection: the window stays put.
    const message = page.getByLabel("Why by hand");
    await message.click();
    const before = await scrollTop();
    await page.keyboard.press("Shift+ArrowUp");
    expect(await scrollTop()).toBe(before);
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
    const form = page.getByRole("form", { name: "MEMBER LOGON" });
    const user = page.getByLabel(USER_LABEL);
    const password = page.getByLabel(PASSWORD_LABEL);
    const apply = form.getByRole("link", { name: "APPLY" });

    // From the panel surface the walk enters at the matching edge.
    await page.locator("#file-LOGON").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("ArrowUp");
    await expect(apply).toBeFocused();
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
    const form = page.getByRole("form", { name: "MEMBER LOGON" });
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
    await expectMinimumContrast(page.getByText("User names are lower-case"));
    await expectMinimumContrast(page.getByText("OR LOG ON WITH"));

    await page.goto("/no-such-route");
    const panel = page.getByRole("region", { name: "404.TXT" });
    await expect(panel).toHaveAttribute(DOS_SURFACE_ATTR, "paper");
    await expectMinimumContrast(page.getByText("No such route in the file list"));
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
    await expect(page.getByText("Saved on this terminal.")).toBeVisible();
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
