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
const RECURSIVE_TITLE = "The hand-written parser: where the precedence table lies";
const THREAD_PATH = "/forum/read-first";
const REPLY_LOCATOR = "#board-post-read-first-2";

function bumpCard(page: Page) {
  return page.getByRole("region", { name: FEED_REGION }).getByRole("link", { name: BUMP_TITLE });
}

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

test("a team join and leave notifies the leads, never the mover", async ({ page }) => {
  await logon(page, "lin");
  await page.goto("/projects/compiler");
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "Compiler" });
  await panel.getByRole("tab", { name: "TEAM" }).click();
  await panel.getByRole("button", { name: "JOIN TEAM" }).click();
  await expect(panel.getByRole("button", { name: "LEAVE TEAM" })).toBeVisible();

  // The mover's own box stays quiet.
  await openInbox(page);
  await expect(page.getByRole("button", { name: "lin joined Compiler" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "lin left Compiler" })).toHaveCount(0);

  // The leads hear about the move and open the project from it.
  await logoff(page);
  await logonSpa(page, "ken");
  await openInbox(page);
  const joined = page.getByRole("button", { name: "lin joined Compiler" });
  await expect(joined).toHaveCount(1);
  await joined.click();
  const joinedDetail = page.getByRole("region", { name: "Compiler" });
  await joinedDetail.getByRole("link", { name: "OPEN" }).click();
  await expect(page).toHaveURL("/projects/compiler");

  // Leaving notifies the leads again, exactly once per move. The leaver acts
  // themselves: ken never joined, so only lin can leave. SPA navigation only:
  // a reload would drop the session mailbox with the join row in it.
  await logoff(page);
  await logonSpa(page, "lin");
  await page.getByRole("region", { name: FILES }).locator("#file-PROJECTS").click();
  await expect(page).toHaveURL("/projects");
  await page.getByRole("link", { name: "Compiler", exact: true }).click();
  await expect(page).toHaveURL("/projects/compiler");
  await page.getByRole("region", { name: "Compiler" }).getByRole("tab", { name: "TEAM" }).click();
  await page
    .getByRole("region", { name: "Compiler" })
    .getByRole("button", {
      name: "LEAVE TEAM",
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Compiler" }).getByRole("button", { name: "JOIN TEAM" }),
  ).toBeVisible();

  await logoff(page);
  await logonSpa(page, "grace");
  await openInbox(page);
  await expect(page.getByRole("button", { name: "lin joined Compiler" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "lin left Compiler" })).toHaveCount(1);
  await expectNoViolations(page, "section team inbox");
});

test("a project approval returns to the proposer with the live page", async ({ page }) => {
  const slug = `event-${Date.now().toString(36)}`;
  const name = `Event ${slug}`;
  await logon(page, "grace");
  await page.goto("/projects");
  await waitForHydration(page);
  await page.getByRole("button", { name: "PROPOSE PROJECT" }).click();
  await expect(page).toHaveURL("/projects/propose");
  const form = page.getByRole("form", { name: "PROPOSE A PROJECT" });
  await form.getByLabel("Project name").fill(name);
  await form.getByLabel("Project URL slug").fill(slug);
  await form.getByLabel("Goal and scope").fill("A shared workshop for event delivery tests.");
  const stackSearch = form.getByRole("combobox", { name: "Stack" });
  await stackSearch.fill("Type");
  await expect(page.getByRole("option", { name: "TypeScript" })).toBeVisible();
  await stackSearch.press("Enter");
  await form
    .getByLabel("What help or contributors are needed?")
    .fill("Members can build examples, tests and documentation.");
  await form.getByRole("button", { name: "SUBMIT PROPOSAL" }).click();
  await expect(
    page.getByRole("region", { name: new RegExp(name) }).getByText("Waiting for admin review."),
  ).toBeVisible();
  await logoff(page);

  // The proposal pages the admin queue's inbox.
  await logonSpa(page, "admin");
  await openInbox(page);
  await expect(page.getByRole("button", { name: `grace proposed ${name}` })).toHaveCount(1);

  // The approval returns to the proposer and opens the live project.
  await page.getByRole("region", { name: FILES }).locator("#file-ADMIN").click();
  await expect(page).toHaveURL("/admin");
  await page.getByRole("tab", { name: "PROJECT PROPOSALS" }).click();
  const review = page.getByRole("region", { name: `${name} grace`, exact: false });
  await review.getByRole("button", { name: "APPROVE" }).click();
  await expect(review.getByText("This application has a final decision.")).toBeVisible();
  await logoff(page);

  await logonSpa(page, "grace");
  await openInbox(page);
  const row = page.getByRole("button", {
    name: "admin decided on your project proposal: approved",
  });
  await expect(row).toHaveCount(1);
  await row.click();
  const detail = page.getByRole("region", { name });
  await detail.getByRole("link", { name: "OPEN" }).click();
  await expect(page).toHaveURL(`/projects/${slug}`);
  await expectNoViolations(page, "section project inbox");
});

test("a moderation ruling notifies the reporter and the author", async ({ page }) => {
  await logon(page, "ken");
  await page.goto(THREAD_PATH);
  await waitForHydration(page);
  await page.locator(REPLY_LOCATOR).getByRole("button", { name: "REPORT" }).click();
  const reportForm = page.getByRole("dialog", { name: "REPORT CONTENT" });
  await reportForm.getByRole("textbox", { name: "Reason" }).fill("This reply needs a review.");
  await reportForm.getByRole("button", { name: "SEND REPORT" }).click();
  await expect(page.locator(REPLY_LOCATOR).getByText("REPORT SENT")).toBeVisible();
  await logoff(page);

  await logonSpa(page, "admin");
  await page.getByRole("region", { name: FILES }).locator("#file-ADMIN").click();
  await expect(page).toHaveURL("/admin");
  await page.getByRole("tab", { name: "MODERATION" }).click();
  await expect(page.getByText("This reply needs a review.")).toBeVisible();
  await page
    .getByRole("textbox", { name: "NEW MODERATOR MESSAGE" })
    .fill("Hidden until corrected.");
  // The ruling notifies synchronously inside the action: no UI text to wait
  // for, the inbox rows below are the assertion.
  await page.getByRole("button", { name: "HIDE NOW" }).click();
  await logoff(page);

  // The reporter and the post author each hold one ruling row to /reports.
  await logonSpa(page, "ken");
  await openInbox(page);
  const reporterRow = page.getByRole("button", { name: /decided on a report about/ });
  await expect(reporterRow).toHaveCount(1);
  await logoff(page);

  await logonSpa(page, "grace");
  await openInbox(page);
  const authorRow = page.getByRole("button", { name: /decided on a report about/ });
  await expect(authorRow).toHaveCount(1);
  await authorRow.click();
  const detail = page.getByRole("region", { name: /READ FIRST/ });
  await detail.getByRole("link", { name: "OPEN" }).click();
  await expect(page).toHaveURL("/reports");
  await expectNoViolations(page, "section moderation inbox");
});

test("a ticket claim notifies the author", async ({ page }) => {
  // Grace leaves DOS-3 first: one active ticket at a time on the mocks.
  await logon(page, "grace");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);
  const tracker = page.getByRole("table", { name: "TICKETS" });
  await tracker.getByRole("link", { name: "DOS-3" }).click();
  await page
    .getByRole("region", { name: "DOS-3" })
    .getByRole("button", { name: "UNASSIGN ME" })
    .click();
  await page.keyboard.press("Escape");
  await tracker.getByRole("link", { name: "TOOL-4" }).click();
  const dossier = page.getByRole("region", { name: "TOOL-4" });
  await dossier.getByRole("button", { name: "ASSIGN TO ME" }).click();
  await expect(dossier.getByRole("button", { name: "UNASSIGN ME" })).toBeVisible();

  // The ticket author hears about the handover and opens the dossier.
  await logoff(page);
  await logonSpa(page, "ada");
  await openInbox(page);
  const row = page.getByRole("button", { name: "grace assigned you TOOL-4" });
  await expect(row).toHaveCount(1);
  await row.click();
  const detail = page.getByRole("region", { name: "TOOL-4" });
  await detail.getByRole("link", { name: "OPEN" }).click();
  await expect(page).toHaveURL("/tickets/TOOL-4");
  await expectNoViolations(page, "section claim inbox");
});

test("a published write-up notifies every note author", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(readroomPath("recursive-descent"));
  await waitForHydration(page);
  const task = page.getByRole("region", { name: RECURSIVE_TITLE });
  await task
    .getByRole("textbox", { name: "WRITE-UP" })
    .fill("## What the code does\n\nThe table is the canon.");
  await task.getByRole("button", { name: "PUBLISH WRITE-UP" }).click();
  await expect(task.getByRole("heading", { name: "WRITE-UP" })).toBeVisible();

  // Every note author holds one row; the notice carries no note text.
  await logoff(page);
  await logonSpa(page, "ken");
  await openInbox(page);
  const row = page.getByRole("button", {
    name: `ada published a write-up for ${RECURSIVE_TITLE}`,
  });
  await expect(row).toHaveCount(1);
  await row.click();
  const detail = page.getByRole("region", { name: RECURSIVE_TITLE });
  await detail.getByRole("link", { name: "OPEN" }).click();
  await expect(page).toHaveURL(readroomPath("recursive-descent"));
  await expectNoViolations(page, "section report inbox");
});
