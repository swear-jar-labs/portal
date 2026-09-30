import { expect, test, type Page } from "@playwright/test";
import { threadPath } from "../../src/features/board/model/threads";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const READ_FIRST = "READ FIRST: how this board works";
const FILES = "C:\\SWEARJAR";
const MENTION_SUBJECT = `ada mentioned you in ${READ_FIRST}`;

async function logoff(page: Page) {
  await page.getByRole("button", { name: "F9 Logoff" }).click();
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

async function openThread(page: Page) {
  await page.getByRole("region", { name: FILES }).locator("#file-FORUM").click();
  await page
    .getByRole("article")
    .filter({ hasText: READ_FIRST })
    .getByRole("link", { name: READ_FIRST })
    .click();
  await expect(page).toHaveURL(threadPath("read-first"));
}

async function openInbox(page: Page) {
  await page.getByRole("region", { name: FILES }).locator("#file-INBOX").click();
  await expect(page).toHaveURL("/inbox");
}

function mentionRow(page: Page) {
  return page.getByRole("button", { name: MENTION_SUBJECT });
}

test("completes a mention from the keyboard and links it in the post", async ({ page }) => {
  await logon(page);
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const thread = page.getByRole("region", { name: READ_FIRST });
  const reply = thread.getByRole("textbox", { name: "REPLY" });

  await reply.click();
  await reply.pressSequentially("@gr");
  const box = page.getByRole("listbox", { name: "Mention a member" });
  await expect(box).toBeVisible();
  await expect(box.getByRole("option", { name: "@grace" })).toBeVisible();
  // The roster floats over the field at the caret, not in the flow below it.
  await expect(box).toHaveCSS("position", "absolute");
  await expectNoViolations(page, "mention completion");

  // The roster walks with arrows; Enter completes the canonical handle.
  await page.keyboard.press("ArrowDown");
  await expect(box.getByRole("option", { name: "@grace" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Enter");
  await expect(reply).toHaveValue("@grace ");
  await expect(box).toHaveCount(0);

  await reply.pressSequentially("take a look");
  await thread.getByRole("button", { name: "POST REPLY" }).click();
  await expect(reply).toHaveValue("");
  const added = thread.getByRole("article").last();
  await expect(added).toContainText("take a look");
  const link = added.getByRole("link", { name: "@grace" });
  await expect(link).toHaveAttribute("href", "/members/grace");
});

test("delivers mentions to the inbox once, even across edits", async ({ page }) => {
  await logon(page);
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const thread = page.getByRole("region", { name: READ_FIRST });

  const reply = thread.getByRole("textbox", { name: "REPLY" });
  await reply.fill("@grace take a look");
  await thread.getByRole("button", { name: "POST REPLY" }).click();
  await expect(thread.getByRole("article").last()).toContainText("take a look");

  // The recipient's box gains exactly one mention row (grace already holds
  // three seeded rows, so the subject names it).
  await logoff(page);
  await logonSpa(page, "grace");
  await openInbox(page);
  await expect(mentionRow(page)).toHaveCount(1);

  // The row opens the detail, and OPEN lands on the mentioning post.
  await mentionRow(page).click();
  const detail = page.getByRole("region", { name: READ_FIRST });
  await expect(detail).toContainText("take a look");
  await detail.getByRole("link", { name: "OPEN" }).click();
  await expect(page).toHaveURL(threadPath("read-first"));
  const landed = page.getByRole("region", { name: READ_FIRST }).getByRole("article").last();
  await expect(landed.getByRole("link", { name: "@grace" })).toHaveAttribute(
    "href",
    "/members/grace",
  );

  // Client-side navigation never duplicates the row.
  await openInbox(page);
  await expect(mentionRow(page)).toHaveCount(1);

  // An edit that adds a tag notifies the newcomer; the first recipient's
  // stable id drops the repeat.
  await logoff(page);
  await logonSpa(page, "ada");
  await openThread(page);
  const mine = page.getByRole("region", { name: READ_FIRST }).getByRole("article").last();
  await mine.getByRole("button", { name: "EDIT" }).click();
  const editor = page.getByRole("textbox", { name: "EDIT POST" });
  await editor.fill("@grace take a look, and @admin too");
  await page.keyboard.press("Shift+Enter");
  await expect(mine).toContainText("[EDITED]");

  await logoff(page);
  await logonSpa(page, "admin");
  await openInbox(page);
  await expect(mentionRow(page)).toHaveCount(1);

  await logoff(page);
  await logonSpa(page, "grace");
  await openInbox(page);
  await expect(mentionRow(page)).toHaveCount(1);
  await expectNoViolations(page, "mention inbox");
});
