import { expect, test, type Page } from "@playwright/test";
import { threadPath } from "../../src/features/board/model/threads";
import { TICKETS_PATH } from "../../src/features/tickets/model/tickets";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const READ_FIRST = "READ FIRST: how this board works";
const FILES = "C:\\SWEARJAR";
const REPLY_SUBJECT = `grace replied in ${READ_FIRST}`;
const COMMENT_SUBJECT = "grace commented on DOS-2";

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

async function openInbox(page: Page) {
  await page.getByRole("region", { name: FILES }).locator("#file-INBOX").click();
  await expect(page).toHaveURL("/inbox");
}

test("a board reply reaches the thread author once, never the replier", async ({ page }) => {
  await logon(page, "grace");
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const thread = page.getByRole("region", { name: READ_FIRST });
  await thread.getByRole("textbox", { name: "REPLY" }).fill("Section events ping.");
  await thread.getByRole("button", { name: "POST REPLY" }).click();
  await expect(thread.getByRole("article").last()).toContainText("Section events ping.");

  // The replier's own box stays quiet.
  await openInbox(page);
  await expect(page.getByRole("button", { name: REPLY_SUBJECT })).toHaveCount(0);

  // The thread author's box gains exactly one row, and it opens the thread.
  await logoff(page);
  await logonSpa(page, "ada");
  await openInbox(page);
  const row = page.getByRole("button", { name: REPLY_SUBJECT });
  await expect(row).toHaveCount(1);
  await row.click();
  const detail = page.getByRole("region", { name: READ_FIRST });
  await expect(detail).toContainText("grace replied in");
  await detail.getByRole("link", { name: "OPEN" }).click();
  await expect(page).toHaveURL(threadPath("read-first"));

  // Client-side navigation never duplicates the row.
  await openInbox(page);
  await expect(page.getByRole("button", { name: REPLY_SUBJECT })).toHaveCount(1);
  await expectNoViolations(page, "section reply inbox");
});

test("a ticket comment reaches the author and the assignee", async ({ page }) => {
  await logon(page, "grace");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);
  await page.getByRole("link", { name: "DOS-2" }).click();
  const dossier = page.getByRole("region", { name: "DOS-2" });
  await dossier.getByRole("textbox", { name: "COMMENT" }).fill("Section events ping.");
  await dossier.getByRole("button", { name: "POST COMMENT" }).click();
  await expect(dossier.getByText("Section events ping.")).toBeVisible();

  // The author (ada) and the assignee (ken) each hold one row; OPEN lands
  // on the commented ticket.
  await logoff(page);
  await logonSpa(page, "ada");
  await openInbox(page);
  await expect(page.getByRole("button", { name: COMMENT_SUBJECT })).toHaveCount(1);

  await logoff(page);
  await logonSpa(page, "ken");
  await openInbox(page);
  const row = page.getByRole("button", { name: COMMENT_SUBJECT });
  await expect(row).toHaveCount(1);
  await row.click();
  const detail = page.getByRole("region", { name: "DOS-2" });
  await detail.getByRole("link", { name: "OPEN" }).click();
  await expect(page).toHaveURL("/tickets/DOS-2");
  await expectNoViolations(page, "section comment inbox");
});

test("an application submit pages admins and the decision returns", async ({ page }) => {
  const applicant = `event-apply-${Date.now().toString(36)}`;
  await logon(page, applicant);
  await page.goto("/apply");
  await waitForHydration(page);
  await page.getByLabel("What would you like to work on or learn?").fill("Work on parsers");
  await page.getByRole("button", { name: "SUBMIT" }).click();
  await expect(page.getByText("Your application is in the admin queue.")).toBeVisible();
  await logoff(page);

  // The submit pages the admin queue's inbox. SPA logons only from here: a
  // full reload would drop the session mailbox with the fresh event in it.
  await logonSpa(page, "admin");
  await page.getByRole("region", { name: FILES }).locator("#file-ADMIN").click();
  await expect(page).toHaveURL("/admin");
  await openInbox(page);
  await expect(page.getByRole("button", { name: `${applicant} applied for Member` })).toHaveCount(
    1,
  );

  // The approval returns to the applicant's inbox and opens the profile.
  await page.getByRole("region", { name: FILES }).locator("#file-ADMIN").click();
  await expect(page).toHaveURL("/admin");
  const review = page.getByRole("region", { name: applicant });
  await review.getByRole("button", { name: "APPROVE" }).click();
  await expect(review.getByText("This application has a final decision.")).toBeVisible();
  await logoff(page);

  await logonSpa(page, applicant);
  await openInbox(page);
  const row = page.getByRole("button", {
    name: "admin decided on your application: approved",
  });
  await expect(row).toHaveCount(1);
  await row.click();
  const detail = page.getByRole("region", { name: "application" });
  await detail.getByRole("link", { name: "OPEN" }).click();
  await expect(page).toHaveURL("/profile");
  await expectNoViolations(page, "section application inbox");
});
