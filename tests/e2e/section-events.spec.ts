import { expect, test, type Page } from "@playwright/test";
import { threadPath } from "../../src/features/board/model/threads";
import { readroomPath } from "../../src/features/readroom/model/readrooms";
import { TICKETS_PATH, ticketPath } from "../../src/features/tickets/model/tickets";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const READ_FIRST = "READ FIRST: how this board works";
const FILES = "C:\\SWEARJAR";
const REPLY_SUBJECT = `grace replied in ${READ_FIRST}`;
const COMMENT_SUBJECT = "grace commented on DOS-2";
const STALL_SUBJECT = "DOS-1 needs a maintainer check-in";
const BUMP_TITLE = "Dissect the allocator that hides a free list behind a bump pointer";
const BUMP_OPENED_SUBJECT = `opened notes for ${BUMP_TITLE}`;
const FEED_REGION = "READROOM.EXE";

function bumpCard(page: Page) {
  return page.getByRole("region", { name: FEED_REGION }).getByRole("link", { name: BUMP_TITLE });
}

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

test("a stalled ticket pages its maintainers once", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-21T08:59:00.000Z") });
  await logon(page, "ada");
  await page.goto(ticketPath("DOS-1"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "DOS-1" });
  await expect(
    dossier.getByText("Three days without a work update. Check in with the assignee"),
  ).toHaveCount(0);

  // The two-minute jump trips the dossier clock: the stall signal appears and
  // pages the maintainers (grace — the watching ada never self-notifies).
  await page.clock.fastForward(2 * 60_000);
  await expect(
    dossier.getByText("Three days without a work update. Check in with the assignee"),
  ).toBeVisible();

  await logoff(page);
  await logonSpa(page, "grace");
  await openInbox(page);
  const row = page.getByRole("button", { name: STALL_SUBJECT });
  await expect(row).toHaveCount(1);
  await row.click();
  const detail = page.getByRole("region", { name: "DOS-1" });
  await detail.getByRole("link", { name: "OPEN" }).click();
  await expect(page).toHaveURL(ticketPath("DOS-1"));

  await openInbox(page);
  await expect(page.getByRole("button", { name: STALL_SUBJECT })).toHaveCount(1);
  await expectNoViolations(page, "section stall inbox");
});

test("crossing the readroom deadline notifies note authors without leaking text", async ({
  page,
}) => {
  await logon(page, "ken");
  await page.goto(readroomPath("bump-allocator"));
  await waitForHydration(page);
  await page.clock.install();
  const task = page.getByRole("region", { name: BUMP_TITLE });
  // Sealed before the deadline: ken reads his own note, ada's stays hidden.
  await expect(task.getByText("walks the list")).toBeVisible();
  await expect(task.getByText("max_free_chunks")).toHaveCount(0);

  // No opening notice exists anywhere yet.
  await logoff(page);
  await logonSpa(page, "lin");
  await openInbox(page);
  await expect(page.getByRole("button", { name: BUMP_OPENED_SUBJECT })).toHaveCount(0);

  // Back to the task as ken, then past the deadline. The jump trips the idle
  // screensaver: its capture listener eats the first keystroke, so wake it
  // before touching the file list or the keystroke never reaches the shell.
  await logoff(page);
  await logonSpa(page, "ken");
  await page.getByRole("region", { name: FILES }).locator("#file-READROOM").click();
  await bumpCard(page).click();
  await expect(page).toHaveURL(readroomPath("bump-allocator"));
  await page.clock.fastForward(5 * 24 * 60 * 60 * 1000);
  const screensaver = page.getByRole("img", { name: "Starfield screensaver" });
  await expect(screensaver).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(screensaver).toBeHidden();

  // A remount past the deadline fires the opening exactly once per session.
  await page.getByRole("region", { name: FILES }).locator("#file-READROOM").click();
  await bumpCard(page).click();
  await expect(page).toHaveURL(readroomPath("bump-allocator"));

  await logoff(page);
  await logonSpa(page, "lin");
  await openInbox(page);
  const row = page.getByRole("button", { name: BUMP_OPENED_SUBJECT });
  await expect(row).toHaveCount(1);
  await row.click();
  // The notice names the task only: no note text travels before the opening.
  const detail = page.getByRole("region", { name: BUMP_TITLE });
  await expect(detail.getByText("max_free_chunks")).toHaveCount(0);
  await detail.getByRole("link", { name: "OPEN" }).click();
  await expect(page).toHaveURL(readroomPath("bump-allocator"));

  await openInbox(page);
  await expect(page.getByRole("button", { name: BUMP_OPENED_SUBJECT })).toHaveCount(1);
  await expectNoViolations(page, "section deadline inbox");
});
