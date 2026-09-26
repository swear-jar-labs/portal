import { expect, test, type Page } from "@playwright/test";
import { messages } from "../../src/content/messages";
import {
  noteElementId,
  READROOM_PATH,
  readroomPath,
} from "../../src/features/readroom/model/readrooms";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const FEED_REGION = "READROOM.EXE";
const BUMP = "Dissect the allocator that hides a free list behind a bump pointer";
const LOOKAHEAD = /Read the lookahead table/;
const RECURSIVE = "The hand-written parser: where the precedence table lies";
const RETRY = "Postmortem read: the retry loop that never slept";
const NEW_TASK = "Read the lock-free queue";
const LOGON_PROMPT = "LOGON REQUIRED";
const SNIPPET = "tests/e2e/fixtures/snippet.c";
const ATTACH_TEMP = "Files stay in this browser session. Nothing is uploaded.";

const feed = (page: Page) => page.getByRole("region", { name: FEED_REGION });

test("a guest cannot post a note: the shell asks to log on", async ({ page }) => {
  await page.goto(readroomPath("bump-allocator"));
  await waitForHydration(page);
  const task = page.getByRole("region", { name: BUMP });

  // An empty submit is a validation error, not a prompt.
  await task.getByRole("button", { name: "POST NOTE" }).click();
  await expect(task.getByText("Write a note first.")).toBeVisible();

  const note = task.getByRole("textbox", { name: "NOTE" });
  await note.fill("A guest note.");
  await task.getByRole("button", { name: "POST NOTE" }).click();
  const dialog = page.getByRole("dialog", { name: LOGON_PROMPT });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "CANCEL" }).click();
  await expect(dialog).toBeHidden();
  // The guest keeps the draft.
  await expect(note).toHaveValue("A guest note.");
});

test("a member posts a note, edits it and reads the [EDITED] marker", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(readroomPath("lookahead-table"));
  await waitForHydration(page);
  const task = page.getByRole("region", { name: LOOKAHEAD });
  await expect(task.getByText("No notes yet.")).toBeVisible();

  await task.getByRole("textbox", { name: "NOTE" }).fill("The dead rows never fire in the suite.");
  await task.getByRole("button", { name: "POST NOTE" }).click();
  await expect(task.getByText("The dead rows never fire in the suite.")).toBeVisible();
  await expect(task.getByText("[YOURS]")).toBeVisible();

  await task.getByRole("button", { name: "EDIT" }).click();
  await task
    .getByRole("textbox", { name: "EDIT NOTE" })
    .fill("Strike that: the rows fire from expr, the comment is old.");
  await task.getByRole("button", { name: "SAVE" }).click();
  await expect(
    task.getByText("Strike that: the rows fire from expr, the comment is old."),
  ).toBeVisible();
  await expect(task.getByText("[EDITED]")).toBeVisible();
  // The closed editor hands the keyboard back to the note.
  await expect(page.locator("[id^='readroom-note-']").first()).toBeFocused();

  // One note per reader: the composer stays closed while the note stands.
  await expect(task.getByRole("textbox", { name: "NOTE" })).toHaveCount(0);
  await expect(task.getByText(messages.readroom.notes.posted)).toBeVisible();

  // Deleting the note reopens the composer and hands it the caret.
  await task.getByRole("button", { name: "DELETE" }).click();
  const dialog = page.getByRole("dialog", { name: "DELETE NOTE" });
  await dialog.getByRole("button", { name: "DELETE" }).click();
  await expect(task.getByText(/Strike that/)).toHaveCount(0);
  await expect(task.getByRole("textbox", { name: "NOTE" })).toBeFocused();
});

test("notes freeze at the deadline: the author loses the editor", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(readroomPath("retry-loop"));
  await waitForHydration(page);
  const task = page.getByRole("region", { name: RETRY });

  // ada wrote retry-loop-1; the task is published, its notes frozen.
  await expect(page.locator(`#${noteElementId("retry-loop-1")}`)).toContainText("1 << attempt");
  await expect(task.getByRole("button", { name: "EDIT" })).toHaveCount(0);
  await expect(task.getByRole("button", { name: "DELETE" })).toHaveCount(0);
  await expect(task.getByRole("textbox", { name: "NOTE" })).toHaveCount(0);
});

test("the lead moves the deadline and the clock follows", async ({ page }) => {
  await logon(page, "grace");
  await page.goto(readroomPath("bump-allocator"));
  await waitForHydration(page);
  const task = page.getByRole("region", { name: BUMP });

  await task.getByRole("button", { name: "MOVE DEADLINE" }).click();
  await task.getByLabel("NEW DEADLINE").fill("2026-12-31T18:00");
  await task.getByRole("button", { name: "SAVE" }).click();

  await expect(task.getByText(/DEADLINE 2026-12-31 \d{2}:\d{2} UTC/)).toBeVisible();
  // Still collecting: the notes form lives on.
  await expect(task.getByRole("textbox", { name: "NOTE" })).toBeVisible();
  await expect(task.getByRole("button", { name: "MOVE DEADLINE" })).toBeVisible();

  // Escape cancels like CANCEL and returns the keyboard to the trigger.
  await task.getByRole("button", { name: "MOVE DEADLINE" }).click();
  await page.keyboard.press("Escape");
  await expect(task.getByLabel("NEW DEADLINE")).toHaveCount(0);
  await expect(task.getByRole("button", { name: "MOVE DEADLINE" })).toBeFocused();

  // A past instant is refused.
  await task.getByRole("button", { name: "MOVE DEADLINE" }).click();
  await task.getByLabel("NEW DEADLINE").fill("2020-01-01T00:00");
  await task.getByRole("button", { name: "SAVE" }).click();
  await expect(task.getByText("Pick a future date and time.")).toBeVisible();
});

test("a past deadline is refused at creation", async ({ page }) => {
  await logon(page, "grace");
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  await page.getByRole("button", { name: "NEW TASK" }).click();
  const form = page.getByRole("form", { name: "NEW TASK" });
  await form.getByLabel("TITLE").fill("Yesterday's read");
  await form.getByRole("textbox", { name: "DESCRIPTION" }).fill("Read it yesterday.");
  await form.getByLabel("DEADLINE").fill("2020-01-01T00:00");
  await form.getByRole("button", { name: "OPEN TASK" }).click();
  await expect(form.getByText("Pick a future date and time.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Yesterday's read" })).toHaveCount(0);
});

test("a member who is not the lead sees no cycle controls", async ({ page }) => {
  await logon(page, "ken");
  await page.goto(readroomPath("bump-allocator"));
  await waitForHydration(page);
  const task = page.getByRole("region", { name: BUMP });
  await expect(task.getByRole("button", { name: "MOVE DEADLINE" })).toHaveCount(0);
  await expect(task.getByRole("button", { name: "STOP TASK" })).toHaveCount(0);
  // Files belong to the lead too: no picker, no empty row for a reader.
  await expect(task.locator('input[type="file"]')).toHaveCount(0);
  await expect(task.getByText("FILES", { exact: true })).toHaveCount(0);
});

test("the lead attaches and removes a file on a task", async ({ page }) => {
  await logon(page, "grace");
  await page.goto(readroomPath("bump-allocator"));
  await waitForHydration(page);
  const task = page.getByRole("region", { name: BUMP });

  await task.locator('input[type="file"]').setInputFiles(SNIPPET);
  const file = task.getByRole("button", { name: "View file snippet.c" });
  await expect(file).toBeVisible();
  await file.focus();
  await page.keyboard.press("Enter");
  const viewer = page.getByRole("dialog", { name: "FILE VIEWER: snippet.c" });
  await expect(viewer.locator("pre")).toContainText("static Node *term");
  await expect(viewer.getByRole("link", { name: "DOWNLOAD" })).toHaveAttribute("href", /^blob:/);
  await expect(viewer.getByRole("link", { name: "DOWNLOAD" })).toHaveAttribute(
    "download",
    "snippet.c",
  );
  await expectNoViolations(page, "attachment viewer");
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(file).toBeFocused();
  await expect(task).toBeVisible();
  await expect(task.getByText("FILES", { exact: true })).toBeVisible();
  await expect(task.getByText(ATTACH_TEMP)).toBeVisible();

  await task.getByRole("button", { name: "Remove file snippet.c" }).click();
  await expect(file).toHaveCount(0);
});

test("the lead stops a cycle: the task closes read-only and the notes close", async ({ page }) => {
  await logon(page, "ken");
  await page.goto(readroomPath("lookahead-table"));
  await waitForHydration(page);
  const task = page.getByRole("region", { name: LOOKAHEAD });

  await task.getByRole("button", { name: "STOP TASK" }).click();
  const dialog = page.getByRole("dialog", { name: "STOP TASK" });
  await expect(dialog.getByText(/Notes still become public at the deadline/)).toBeVisible();
  await dialog.getByRole("button", { name: "STOP" }).click();

  await expect(task.getByText("This reading was stopped without a write-up.")).toBeVisible();
  await expect(task.getByText(/ARCHIVED \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/)).toBeVisible();
  await expect(task.getByRole("textbox", { name: "NOTE" })).toHaveCount(0);
  await expect(task.getByRole("button", { name: "STOP TASK" })).toHaveCount(0);
});

test("the lead publishes the write-up in reviewing", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(readroomPath("recursive-descent"));
  await waitForHydration(page);
  const task = page.getByRole("region", { name: RECURSIVE });

  await expect(
    task.getByText("Notes are now open for everyone to read. A write-up may follow."),
  ).toHaveCount(0);
  await task
    .getByRole("textbox", { name: "WRITE-UP" })
    .fill("## What the code does\n\nThe table is the canon; the `switch` is the special case.");
  await task.getByRole("button", { name: "PUBLISH WRITE-UP" }).click();

  await expect(task.getByRole("heading", { name: "WRITE-UP" })).toBeVisible();
  await expect(task.getByRole("heading", { name: "What the code does" })).toBeVisible();
  await expect(task.getByText(/PUBLISHED \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/)).toBeVisible();
  await expect(task.getByRole("button", { name: "PUBLISH WRITE-UP" })).toHaveCount(0);
});

test("a member opens a task in this session", async ({ page }) => {
  await logon(page, "grace");
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  await expect(feed(page).getByText("5 TASKS")).toBeVisible();

  // The fixture tags read on the card (Top shows every task).
  await expect(
    feed(page).getByRole("article").filter({ hasText: LOOKAHEAD }).getByText("C", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "NEW TASK" }).click();
  const form = page.getByRole("form", { name: "NEW TASK" });
  await form.getByLabel("TITLE").fill(NEW_TASK);
  await form.getByRole("button", { name: "C", exact: true }).click();
  await form.getByRole("button", { name: "Go", exact: true }).click();
  await form
    .getByRole("textbox", { name: "DESCRIPTION" })
    .fill("Find the memory order that is missing.");
  await form
    .getByLabel("SOURCE URL")
    .fill("https://github.com/swear-jar-labs/queue-lab/blob/abc123/src/queue.rs");
  await form.getByLabel("TICKET").fill("DOS-3");
  await form.locator('input[type="file"]').setInputFiles(SNIPPET);
  await form.getByLabel("DEADLINE").fill("2026-12-24T18:00");
  await form.getByRole("button", { name: "OPEN TASK" }).click();

  // The composed task opens as a layer over the feed.
  const task = page.getByRole("region", { name: NEW_TASK });
  await expect(task).toBeVisible();
  await expect(
    task.getByRole("link", { name: /queue-lab\/blob\/abc123\/src\/queue\.rs$/ }),
  ).toBeVisible();
  await expect(task.getByRole("link", { name: "DOS-3" })).toBeVisible();
  await expect(task.getByText("Table contract for the tickets tracker")).toBeVisible();
  await expect(task.getByText("C", { exact: true })).toBeVisible();
  await expect(task.getByText("Go", { exact: true })).toBeVisible();
  await expect(task.getByRole("button", { name: "View file snippet.c" })).toBeVisible();
  await expect(task.getByText(/DEADLINE 2026-12-24 \d{2}:\d{2} UTC/)).toBeVisible();

  // The new task collects notes like any other.
  await task.getByRole("textbox", { name: "NOTE" }).fill("The CAS loop drops the notify.");
  await task.getByRole("button", { name: "POST NOTE" }).click();
  await expect(task.getByText("The CAS loop drops the notify.")).toBeVisible();

  // Closing the layer lands on the feed: the composed task joins Top,
  // the card carries the tag.
  await task.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("region", { name: FEED_REGION })).toBeVisible();
  await expect(feed(page).getByText("6 TASKS")).toBeVisible();
  const card = feed(page).getByRole("article").filter({ hasText: NEW_TASK });
  await expect(card).toBeVisible();
  await expect(card.getByText("C", { exact: true })).toBeVisible();
  // The closed layer hands the keyboard back to the card it came from.
  await expect(card.getByRole("button", { name: NEW_TASK })).toBeFocused();
});

test("refuses an unknown ticket key", async ({ page }) => {
  await logon(page, "grace");
  await page.goto(READROOM_PATH);
  await waitForHydration(page);

  await page.getByRole("button", { name: "NEW TASK" }).click();
  const form = page.getByRole("form", { name: "NEW TASK" });
  await form.getByLabel("TITLE").fill("Read the lock-free queue");
  await form
    .getByRole("textbox", { name: "DESCRIPTION" })
    .fill("Find the memory order that is missing.");
  const ticket = form.getByLabel("TICKET");
  await ticket.fill("NOPE-1");
  await expect(page.getByText("No tickets match.")).toBeVisible();
  await form.getByLabel("DEADLINE").fill("2026-12-24T18:00");
  await form.getByRole("button", { name: "OPEN TASK" }).click();
  await expect(form.getByText("No ticket with this key.")).toBeVisible();
  // Nothing was composed: Top still lists its five fixtures.
  await expect(feed(page).getByText("5 TASKS")).toBeVisible();
});

test("pins a ticket link as the source", async ({ page }) => {
  await logon(page, "grace");
  await page.goto(READROOM_PATH);
  await waitForHydration(page);

  await page.getByRole("button", { name: "NEW TASK" }).click();
  const form = page.getByRole("form", { name: "NEW TASK" });
  await form.getByLabel("TITLE").fill("Read the table contract");
  await form
    .getByRole("textbox", { name: "DESCRIPTION" })
    .fill("Pin the ticket pool, not a pasted link.");
  await form.getByLabel("TICKET").fill("DOS-3");
  // The ticket's pool offers its pinned links (and the product repo) while
  // the source stays empty: a pin, never an overwrite.
  const suggestion = form.getByRole("button", { name: "PR LINK Tickets tracker on Table" });
  await expect(suggestion).toBeVisible();
  await expect(form.getByRole("button", { name: /REPO LINK/ })).toBeVisible();
  await expectNoViolations(page, "compose form with ticket suggestions");
  await suggestion.click();
  await expect(form.getByLabel("SOURCE URL")).toHaveValue(/pull\/51$/);
  await form.getByLabel("DEADLINE").fill("2026-12-24T18:00");
  await form.getByRole("button", { name: "OPEN TASK" }).click();

  const task = page.getByRole("region", { name: "Read the table contract" });
  await expect(task.getByRole("link", { name: /pull\/51$/ })).toBeVisible();
  await expectNoViolations(page, "task composed from a ticket link");
});

test("a guest cannot open a task", async ({ page }) => {
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  await page.getByRole("button", { name: "NEW TASK" }).click();
  await expect(page.getByRole("dialog", { name: LOGON_PROMPT })).toBeVisible();
});

test("has no accessibility violations with the open forms", async ({ page }) => {
  await logon(page, "grace");
  await page.goto(readroomPath("bump-allocator"));
  await expect(page.getByRole("region", { name: BUMP })).toBeVisible();
  await expectNoViolations(page, "collecting task with the note form");

  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  await page.getByRole("button", { name: "NEW TASK" }).click();
  await expect(page.getByRole("form", { name: "NEW TASK" })).toBeVisible();
  await expectNoViolations(page, "compose layer");

  await page.goto(readroomPath("bump-allocator"));
  await expect(page.getByRole("region", { name: BUMP })).toBeVisible();
  await page.getByRole("button", { name: "MOVE DEADLINE" }).click();
  await expect(page.getByLabel("NEW DEADLINE")).toBeVisible();
  await expectNoViolations(page, "deadline form");
});
