import { expect, test, type Page } from "@playwright/test";
import { threadPath } from "../../src/features/board/model/threads";
import { NOTIFICATION_PREFS_STORAGE_KEY } from "../../src/features/shell/notification-prefs";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const READ_FIRST = "READ FIRST: how this board works";
const FILES = "C:\\SWEARJAR";
const MENTION_TOGGLE = "@Mentions of you";
const REPLIES_TOGGLE = "Replies to your threads";
const SEEDED_REPLY = "Grace replied in read-first";

async function logoff(page: Page) {
  await page.getByRole("button", { name: "F10 Logoff" }).click();
  await page.getByRole("button", { name: "LOG OFF" }).click();
  await expect(page).toHaveURL("/");
}

async function logonSpa(page: Page, user: string) {
  await page.getByRole("region", { name: FILES }).locator("#file-LOGON").click();
  await page.getByLabel("Username or email").fill(user);
  await page.getByLabel("Password").fill("secret");
  await page.getByRole("button", { name: "LOG ON" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });
}

async function openInbox(page: Page) {
  await page.getByRole("region", { name: FILES }).locator("#file-INBOX").click();
  await expect(page).toHaveURL("/inbox");
}

async function openSettings(page: Page) {
  await page.goto("/settings");
  await waitForHydration(page);
}

function storedPrefs(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), NOTIFICATION_PREFS_STORAGE_KEY);
}

async function saveSettings(page: Page) {
  const save = page.getByRole("button", { name: "SAVE" });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(save).toBeDisabled();
}

async function mentionGrace(page: Page, text: string) {
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const thread = page.getByRole("region", { name: READ_FIRST });
  const reply = thread.getByRole("textbox", { name: "REPLY" });
  await reply.fill(`@grace ${text}`);
  await thread.getByRole("button", { name: "POST REPLY" }).click();
  await expect(thread.getByRole("article").last()).toContainText(text);
}

function mentionRows(page: Page) {
  return page.getByRole("button", { name: /mentioned you in/ });
}

test("muted mentions never land in the inbox", async ({ page }) => {
  await logon(page, "grace");
  await openSettings(page);

  const toggle = page.getByRole("checkbox", { name: MENTION_TOGGLE });
  const save = page.getByRole("button", { name: "SAVE" });
  await expect(toggle).toBeChecked();
  await expect(save).toBeDisabled();

  // Keyboard: focus the toggle and flip it with Space.
  await toggle.focus();
  await page.keyboard.press(" ");
  await expect(toggle).not.toBeChecked();
  await expect(save).toBeEnabled();
  await expectNoViolations(page, "notification settings");

  // Edits stay in the form until SAVE is pressed.
  expect(await storedPrefs(page)).toBeNull();
  await save.click();
  await expect(save).toBeDisabled();
  await expect
    .poll(() => storedPrefs(page))
    .toBe('{"grace":{"reply":true,"ticket":true,"mention":false,"readroom":true,"team":true}}');

  await logoff(page);
  await logonSpa(page, "ken");
  await mentionGrace(page, "take a look while muted");

  await logoff(page);
  await logonSpa(page, "grace");
  await openInbox(page);
  await expect(mentionRows(page)).toHaveCount(0);
  // The rest of the box is untouched: the seeded reply row still shows.
  await expect(page.getByRole("button", { name: SEEDED_REPLY })).toHaveCount(1);
});

test("muting a kind hides its seeded rows until it is back on", async ({ page }) => {
  await logon(page, "grace");
  await openInbox(page);
  await expect(page.getByRole("button", { name: SEEDED_REPLY })).toHaveCount(1);

  await openSettings(page);
  await page.getByRole("checkbox", { name: REPLIES_TOGGLE }).uncheck();
  await saveSettings(page);
  await expect
    .poll(() => storedPrefs(page))
    .toBe('{"grace":{"reply":false,"ticket":true,"mention":true,"readroom":true,"team":true}}');

  await openInbox(page);
  await expect(page.getByRole("button", { name: SEEDED_REPLY })).toHaveCount(0);

  await openSettings(page);
  await page.getByRole("checkbox", { name: REPLIES_TOGGLE }).check();
  await saveSettings(page);

  await openInbox(page);
  await expect(page.getByRole("button", { name: SEEDED_REPLY })).toHaveCount(1);
});

test("a muted delivery stays lost after the kind is back on", async ({ page }) => {
  await logon(page, "grace");
  await openSettings(page);
  await page.getByRole("checkbox", { name: MENTION_TOGGLE }).uncheck();
  await saveSettings(page);

  await logoff(page);
  await logonSpa(page, "ken");
  await mentionGrace(page, "first ping while muted");

  await logoff(page);
  await logonSpa(page, "grace");
  await openSettings(page);
  await page.getByRole("checkbox", { name: MENTION_TOGGLE }).check();
  await saveSettings(page);

  await logoff(page);
  await logonSpa(page, "ken");
  await mentionGrace(page, "second ping after unmute");

  await logoff(page);
  await logonSpa(page, "grace");
  await openInbox(page);
  // The muted ping was dropped at delivery, never stored: exactly one row.
  await expect(mentionRows(page)).toHaveCount(1);
  await mentionRows(page).click();
  await expect(page.getByRole("region", { name: READ_FIRST })).toContainText(
    "second ping after unmute",
  );
  await expectNoViolations(page, "notification inbox");
});
