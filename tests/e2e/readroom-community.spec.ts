import { expect, test, type Page } from "@playwright/test";
import { READROOM_PATH, readroomPath } from "../../src/features/readroom/model/readrooms";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const FEED_REGION = "READROOM.EXE";
const BUMP = "Dissect the allocator that hides a free list behind a bump pointer";
const RETRY = "Postmortem read: the retry loop that never slept";
const ARCHIVED = "Archived: the token cache that remembered everything";
const COMMUNITY_TASK = "Read the community queue";
const LOGON_PROMPT = "LOGON REQUIRED";

const FILES_REGION = "C:\\SWEARJAR";

const feed = (page: Page) => page.getByRole("region", { name: FEED_REGION });
const modes = (page: Page) => feed(page).getByRole("group", { name: "READROOM MODE" });

async function logoff(page: Page) {
  await page.getByRole("button", { name: "F9 Logoff" }).click();
  await page.getByRole("button", { name: "LOG OFF" }).click();
  await expect(page).toHaveURL("/");
}

// SPA hops through the file manager: unlike page.goto they keep the session
// mock stores (the composed tasks and the votes) alive across actor switches.
async function gotoReadroomSpa(page: Page) {
  await page.getByRole("region", { name: FILES_REGION }).locator("#file-READROOM").click();
  await expect(page).toHaveURL(READROOM_PATH);
}

async function logonSpa(page: Page, user: string) {
  await page.getByRole("region", { name: FILES_REGION }).locator("#file-LOGON").click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Username").fill(user);
  await page.getByLabel("Password").fill("secret");
  await page.getByRole("button", { name: "LOG ON" }).click();
  // The file manager carries ?next=%2F, so the return lands on the landing.
  await expect(page).toHaveURL("/", { timeout: 15_000 });
}

async function openLocalTask(page: Page, title: string) {
  const card = feed(page).getByRole("article").filter({ hasText: title });
  await card.getByRole("button", { name: title }).click();
  const task = page.getByRole("region", { name: title });
  await expect(task).toBeVisible();
  return task;
}

test("a Participant opens a task, a second account notes and votes, the switch keeps both", async ({
  page,
}) => {
  await logon(page, "demo-candidate");
  await gotoReadroomSpa(page);
  await waitForHydration(page);

  await page.getByRole("button", { name: "NEW TASK" }).click();
  const form = page.getByRole("form", { name: "NEW TASK" });
  await form.getByLabel("TITLE").fill(COMMUNITY_TASK);
  await form.getByRole("textbox", { name: "DESCRIPTION" }).fill("A Participant opens this read.");
  await form.getByRole("button", { name: "OPEN TASK" }).click();
  const opened = page.getByRole("region", { name: COMMUNITY_TASK });
  await expect(opened).toBeVisible();
  await opened.getByRole("button", { name: "Close" }).click();
  await expect(feed(page).getByText("6 TASKS")).toBeVisible();
  await logoff(page);

  // The composed task survives the actor switch (the mock contract of 01):
  // the second account finds it in Active, notes and votes.
  await logonSpa(page, "demo-second");
  await gotoReadroomSpa(page);
  await waitForHydration(page);
  const second = await openLocalTask(page, COMMUNITY_TASK);
  await second.getByRole("textbox", { name: "NOTE" }).fill("The second reader disagrees.");
  await second.getByRole("button", { name: "POST NOTE" }).click();
  await expect(second.getByText("The second reader disagrees.")).toBeVisible();
  await second.getByRole("button", { name: "▲ 0 VOTES" }).click();
  await expect(second.getByRole("button", { name: "▲ 1 VOTE" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await logoff(page);

  // Back as the author: the foreign note stays sealed, the vote stays counted,
  // the author's own composer stays open.
  await logonSpa(page, "demo-candidate");
  await gotoReadroomSpa(page);
  await waitForHydration(page);
  const mine = await openLocalTask(page, COMMUNITY_TASK);
  await expect(mine.getByText("1 NOTE SEALED")).toBeVisible();
  await expect(mine.getByText("The second reader disagrees.")).toHaveCount(0);
  await expect(mine.getByRole("button", { name: "▲ 1 VOTE" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(mine.getByRole("textbox", { name: "NOTE" })).toBeVisible();
});

test("the modes switch the feed deterministically and the stopped task sinks with the rest", async ({
  page,
}) => {
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  const cards = feed(page).getByRole("article");

  // Top leads by default: the most-voted task first, the stopped one sinks
  // with the rest under its ARCHIVED chip — no separate shelf.
  await expect(modes(page).getByRole("button", { name: "TOP" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(feed(page).getByText("5 TASKS")).toBeVisible();
  await expect(cards.nth(0)).toContainText(RETRY);
  await expect(cards.nth(1)).toContainText(BUMP);
  await expect(cards.nth(4)).toContainText(ARCHIVED);
  await expect(cards.nth(4)).toContainText("ARCHIVED");
  await expect(feed(page).getByRole("heading", { name: "ARCHIVE", exact: true })).toHaveCount(0);

  await modes(page).getByRole("button", { name: "NEW" }).click();
  await expect(modes(page).getByRole("button", { name: "NEW" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(cards.nth(0)).toContainText(/Read the lookahead table/);
  await expect(cards.nth(4)).toContainText(ARCHIVED);

  await modes(page).getByRole("button", { name: "ACTIVE" }).click();
  await expect(feed(page).getByText("2 TASKS")).toBeVisible();
  await expect(cards.nth(0)).toContainText(BUMP);
  await expect(cards).toHaveCount(2);
  await expectNoViolations(page, "readroom feed modes");
});

test("a guest meets the logon prompt, a Participant votes once and withdraws", async ({ page }) => {
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  const card = feed(page).getByRole("article").filter({ hasText: BUMP });

  await card.getByRole("button", { name: "▲ 1 VOTE" }).click();
  const dialog = page.getByRole("dialog", { name: LOGON_PROMPT });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "CANCEL" }).click();
  await expect(card.getByRole("button", { name: "▲ 1 VOTE" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await logon(page, "demo-second");
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  const voted = feed(page).getByRole("article").filter({ hasText: BUMP });
  await voted.getByRole("button", { name: "▲ 1 VOTE" }).click();
  await expect(voted.getByRole("button", { name: "▲ 2 VOTES" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // The open task shows the same vote; a second press withdraws it.
  await voted.getByRole("link", { name: BUMP }).click();
  const task = page.getByRole("region", { name: BUMP });
  await expect(task.getByRole("button", { name: "▲ 2 VOTES" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await task.getByRole("button", { name: "▲ 2 VOTES" }).click();
  await expect(task.getByRole("button", { name: "▲ 1 VOTE" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("a project maintainer gets no cycle rights from the ticket link", async ({ page }) => {
  // ken maintains Compiler; the linked DOS-3 belongs to SWEARJAR.DOS, led by
  // grace. The link is context: no deadline moves, no stops, and the other
  // readers' notes stay sealed.
  await logon(page, "ken");
  await page.goto(readroomPath("bump-allocator"));
  await waitForHydration(page);
  const task = page.getByRole("region", { name: BUMP });
  await expect(task.getByRole("button", { name: "MOVE DEADLINE" })).toHaveCount(0);
  await expect(task.getByRole("button", { name: "STOP TASK" })).toHaveCount(0);
  await expect(task.getByText("2 NOTES SEALED")).toBeVisible();
});
