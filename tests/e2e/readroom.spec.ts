import { expect, test, type Page } from "@playwright/test";
import { DOS_SCROLL_ATTR, DOS_SURFACE_ATTR } from "@swearjar/dos/contracts";
import { messages } from "../../src/content/messages";
import { DOC_LAYER_ATTR, DOC_TOP_ATTR } from "../../src/features/shell/attributes";
import {
  READROOM_CARD_ATTR,
  READROOM_PATH,
  readroomPath,
} from "../../src/features/readroom/readrooms";
import { ticketPath } from "../../src/features/tickets/model/tickets";
import {
  enterShell,
  expectAbove,
  expectMinimumContrast,
  expectNoViolations,
  expectSameVerticalCenter,
  logon,
  waitForHydration,
} from "./helpers";

const FEED_REGION = "READROOM.EXE";
const FILES_REGION = "C:\\SWEARJAR";
const BUMP = "Dissect the allocator that hides a free list behind a bump pointer";
const RECURSIVE = "The hand-written parser: where the precedence table lies";
const RETRY = "Postmortem read: the retry loop that never slept";
const ARCHIVED = "Archived: the token cache that remembered everything";
const TICKET_CHIP = "TICKET #DOS-3";
const DOS_THREE = "Table contract for the tickets tracker";
const layers = (page: Page) => page.locator(`[${DOC_LAYER_ATTR}]`);
// The PanelStack effect focuses the top layer's body; the focus is the sync
// point for keyboard tests behind the Suspense-less RSC render.
const focusedBody = (page: Page) => page.locator(`[${DOC_TOP_ATTR}] [${DOS_SCROLL_ATTR}]`);

test("opens the readroom from the file manager and keeps its file current", async ({ page }) => {
  await enterShell(page);
  const files = page.getByRole("region", { name: FILES_REGION });
  await files.locator("#file-READROOM").click();

  await expect(page).toHaveURL(READROOM_PATH);
  await expect(page.getByRole("region", { name: FEED_REGION })).toBeVisible();
  await expect(files.locator("#file-READROOM")).toHaveAttribute("aria-current", "true");
});

test("ranks the top feed with the stopped task in the list", async ({ page }) => {
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });
  const cards = feed.getByRole("article");

  // Top leads by default (most-voted task first); the stopped cycle sinks
  // with the rest under its ARCHIVED chip — no separate shelf.
  await expect(feed.getByText("5 TASKS")).toBeVisible();
  await expect(cards).toHaveCount(5);
  await expect(cards.nth(0)).toContainText(RETRY);
  await expect(cards.nth(0)).toContainText("PUBLISHED");
  await expect(cards.nth(0)).toContainText("4W AGO");
  await expect(cards.nth(0).getByRole("button", { name: "▲ 2 VOTES" })).toBeVisible();
  await expect(cards.nth(1)).toContainText(BUMP);
  await expect(cards.nth(1)).toContainText("2D AGO");
  await expect(cards.nth(1)).toContainText("COLLECTING");
  await expect(cards.nth(1)).not.toContainText(/IN \d+[DWM]/);
  await expect(cards.nth(1)).toContainText("3 NOTES");
  await expect(cards.nth(1).getByRole("link", { name: TICKET_CHIP })).toBeVisible();
  await expect(cards.nth(1).getByRole("button", { name: "▲ 1 VOTE" })).toBeVisible();
  // Every feed card carries its section icon in the title row.
  await expect(cards.nth(1).locator('[data-file-icon="book"]')).toBeVisible();
  await expectSameVerticalCenter(
    cards.nth(1).getByRole("link", { name: "grace" }),
    cards.nth(1).getByText("2D AGO · 3 NOTES", { exact: true }),
  );
  // The byline reads above the title on screen through the CSS slot order,
  // while the title leads the DOM: the walk enters the row on it.
  await expectAbove(
    cards.nth(1).getByRole("link", { name: "grace" }),
    cards.nth(1).getByRole("link").first(),
  );

  await expect(feed.getByRole("heading", { name: "ARCHIVE", exact: true })).toHaveCount(0);
  await expect(cards.nth(4)).toContainText(ARCHIVED);
  await expect(cards.nth(4)).toContainText("ARCHIVED");
  await expect(cards.nth(4)).toContainText("7W AGO");
});

test("opens a task over the feed and pops back to the focused card", async ({ page }) => {
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  // Reviewing reads through Top, not Active.
  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("button", {
      name: "TOP",
      exact: true,
    })
    .click();
  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: RECURSIVE })
    .click();

  const task = page.getByRole("region", { name: RECURSIVE });
  await expect(page).toHaveURL(readroomPath("recursive-descent"));
  await expect(task).toBeVisible();
  // The task reads like a thread: white cards on silver.
  await expect(task).toHaveAttribute(DOS_SURFACE_ATTR, "light");
  await expect(focusedBody(page)).toBeFocused();
  await expect(layers(page)).toHaveCount(2);
  await expect(layers(page).first()).toHaveAttribute("inert", "");
  await expect(layers(page).last()).not.toHaveAttribute("inert", "");

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(READROOM_PATH);
  await expect(page.locator("#readroom-card-recursive-descent")).toBeFocused();
});

test("a deep link opens the stack and closes by pushing the feed", async ({ page }) => {
  await page.goto(readroomPath("recursive-descent"));
  await waitForHydration(page);
  await expect(page).toHaveTitle(`${RECURSIVE} — Swear Jar Labs`);
  await expect(focusedBody(page)).toBeFocused();
  await expect(layers(page)).toHaveCount(2);

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(READROOM_PATH);
  await expect(page.getByRole("region", { name: FEED_REGION })).toBeVisible();
});

test("a second Esc does not pop another layer while the close is in flight", async ({ page }) => {
  await page.goto(readroomPath("recursive-descent"));
  await waitForHydration(page);
  await expect(focusedBody(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(READROOM_PATH);

  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("button", {
      name: "TOP",
      exact: true,
    })
    .click();
  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: RECURSIVE })
    .click();
  await expect(page).toHaveURL(readroomPath("recursive-descent"));
  await expect(focusedBody(page)).toBeFocused();

  // Both presses go out back to back: one close owns the pop.
  await Promise.all([page.keyboard.press("Escape"), page.keyboard.press("Escape")]);
  await expect(page).toHaveURL(READROOM_PATH);
  await expect(page.getByRole("region", { name: FEED_REGION })).toBeVisible();
});

test("the task [X] closes back to the feed", async ({ page }) => {
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("button", {
      name: "TOP",
      exact: true,
    })
    .click();
  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: RECURSIVE })
    .click();

  const task = page.getByRole("region", { name: RECURSIVE });
  await task.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(READROOM_PATH);
});

test("lays a lone panel flush and steps the stacked task down", async ({ page }) => {
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  const margins = (target: Page) =>
    layers(target).evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return { left: style.marginLeft, top: style.marginTop };
      }),
    );

  expect(await margins(page)).toEqual([{ left: "0px", top: "0px" }]);

  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("button", {
      name: "TOP",
      exact: true,
    })
    .click();
  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: RECURSIVE })
    .click();
  await expect(layers(page)).toHaveCount(2);
  const stacked = await margins(page);
  expect(stacked[0]).toEqual({ left: "0px", top: "0px" });
  expect(stacked[1]?.left).toBe("0px");
  expect(stacked[1]?.top).not.toBe("0px");
});

test("stacks the layers flush on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto(readroomPath("recursive-descent"));
  await expect(page.getByRole("region", { name: RECURSIVE })).toBeVisible();

  const margin = await page
    .locator(`[${DOC_TOP_ATTR}]`)
    .evaluate((element) => getComputedStyle(element).marginTop);
  expect(margin).toBe("0px");
});

test("stacks the member layer flush on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  // Grace leads the first Active task.
  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("button", {
      name: "ACTIVE",
      exact: true,
    })
    .click();
  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("article")
    .first()
    .getByRole("link", { name: "grace" })
    .click();

  await expect(page).toHaveURL("/members/grace");
  await expect(page.getByRole("region", { name: "MEMBERS.EXE" })).toBeVisible();
  const margin = await page
    .locator(`[${DOC_TOP_ATTR}]`)
    .evaluate((element) => getComputedStyle(element).marginTop);
  expect(margin).toBe("0px");
});

test("shows the source link and the Markdown pipeline", async ({ page }) => {
  await page.goto(readroomPath("bump-allocator"));
  const task = page.getByRole("region", { name: BUMP });

  await expect(task.getByText("SOURCE")).toBeVisible();
  await expect(task.getByRole("link", { name: /SmpAllocator\.zig$/ })).toHaveAttribute(
    "href",
    /8f9d6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f/,
  );
  await expect(task.getByText(/DEADLINE \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/)).toBeVisible();
  // The tone directive renders as its content, not as literal markers.
  await expect(task.getByText("O(1) worst case")).toBeVisible();
  await expect(task.getByText(/:cyan\[/)).toHaveCount(0);

  // The snippet has no repository: no source row at all, only its tag.
  await page.goto(readroomPath("lookahead-table"));
  const snippet = page.getByRole("region", { name: /Read the lookahead table/ });
  await expect(snippet.getByText("SOURCE")).toHaveCount(0);
  await expect(snippet.getByText("C", { exact: true })).toBeVisible();

  // A code block survives the pipeline into the description.
  await page.goto(readroomPath("recursive-descent"));
  const parser = page.getByRole("region", { name: RECURSIVE });
  await expect(parser.locator("pre")).toContainText("static Node *term");
});

test("links the ticket row to its live dossier", async ({ page }) => {
  await page.goto(readroomPath("bump-allocator"));
  const task = page.getByRole("region", { name: BUMP });
  // The ticket reads as key plus title under the attached files, not as a chip.
  const key = task.getByRole("link", { name: "DOS-3" });
  await expect(key).toHaveAttribute("href", ticketPath("DOS-3"));
  await expect(task.getByText(DOS_THREE)).toBeVisible();

  await key.click();
  await expect(page).toHaveURL(ticketPath("DOS-3"));
  const dossier = page.getByRole("region", { name: "DOS-3" });
  await expect(dossier.getByRole("heading", { level: 1, name: DOS_THREE })).toBeVisible();
  // The dossier's reverse list points back at the cycle that reads its code.
  await expect(dossier.getByRole("link", { name: BUMP })).toHaveAttribute(
    "href",
    readroomPath("bump-allocator"),
  );
});

test("seals notes from a guest until the deadline", async ({ page }) => {
  await page.goto(readroomPath("bump-allocator"));
  const task = page.getByRole("region", { name: BUMP });
  await expect(task.getByText("3 NOTES SEALED")).toBeVisible();
  await expect(task.getByText(/max_free_chunks/)).toHaveCount(0);
  await expect(task.getByText(/pushes the chunk back/)).toHaveCount(0);

  // Past the deadline the frozen notes are public, guests included.
  await page.goto(readroomPath("recursive-descent"));
  await expect(
    page.getByRole("region", { name: RECURSIVE }).getByText(/instrumenting/),
  ).toBeVisible();
});

test("shows a member their own notes and seals the rest before the deadline", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(readroomPath("bump-allocator"));
  const task = page.getByRole("region", { name: BUMP });

  await expect(task.getByText("[YOURS]")).toBeVisible();
  await expect(task.getByText(/max_free_chunks/)).toBeVisible();
  await expect(task.getByText("2 NOTES SEALED")).toBeVisible();
  await expect(task.getByText(/pushes the chunk back/)).toHaveCount(0);
  // One note per reader: the composer stays closed while her note stands.
  await expect(task.getByRole("textbox", { name: "NOTE" })).toHaveCount(0);
  await expect(task.getByText(messages.readroom.notes.posted)).toBeVisible();

  // The author deletes her note: the seal keeps the others, the composer returns.
  await task.getByRole("button", { name: "DELETE" }).click();
  await page
    .getByRole("dialog", { name: "DELETE NOTE" })
    .getByRole("button", { name: "DELETE" })
    .click();
  await expect(task.getByText(/max_free_chunks/)).toHaveCount(0);
  await expect(task.getByText("2 NOTES SEALED")).toBeVisible();
  await expect(task.getByRole("textbox", { name: "NOTE" })).toBeFocused();
});

test("shows the report of a published task and the review hint otherwise", async ({ page }) => {
  await page.goto(readroomPath("recursive-descent"));
  await expect(
    page
      .getByRole("region", { name: RECURSIVE })
      .getByText("Notes are now open for everyone to read. A write-up may follow."),
  ).toBeVisible();

  await page.goto(readroomPath("retry-loop"));
  const task = page.getByRole("region", { name: RETRY });
  await expect(task.getByRole("heading", { name: "WRITE-UP" })).toBeVisible();
  await expect(task.getByRole("heading", { name: "What the code does" })).toBeVisible();
  await expect(task.getByText(/Two lines, one night/)).toBeVisible();
  await expect(task.getByText(/PUBLISHED \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/)).toBeVisible();

  // Every card of the open task reads white on the silver panel: on
  // retry-loop a guest sees all five (the description, three notes, the
  // write-up) — a card that loses its stamp drops the count.
  const cards = task.locator(`[${READROOM_CARD_ATTR}]`);
  await expect(cards).toHaveCount(5);
  for (const card of await cards.all()) {
    await expect(card).toHaveCSS("background-color", "rgb(255, 255, 255)");
  }
});

test("walks the feed and the task by rows", async ({ page }) => {
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });
  const first = feed.getByRole("article").first();

  // Walk the collecting task: Active leads with the bump allocator and its
  // ticket chip.
  await feed.getByRole("button", { name: "ACTIVE", exact: true }).click();
  // ▲/▼ enter the card rows on the card title (it leads the DOM while the
  // byline reads above it on screen); the first step retries until the
  // island's listeners answer (the feed hydrates after the shell clock). The
  // compose row leads the feed, the mode switch follows, then the cards.
  await expect(async () => {
    await focusedBody(page).focus();
    await page.keyboard.press("ArrowDown");
    await expect(feed.getByRole("button", { name: "NEW TASK" })).toBeFocused({
      timeout: 1_000,
    });
    await page.keyboard.press("ArrowDown");
    await expect(feed.getByRole("button", { name: "TOP", exact: true })).toBeFocused({
      timeout: 1_000,
    });
    await page.keyboard.press("ArrowDown");
    await expect(first.getByRole("link").first()).toBeFocused({ timeout: 1_000 });
  }).toPass();

  // ▶ walks from the card title to the lead link and the ticket chip, ◀ back;
  // Space on the title opens the task.
  await page.keyboard.press("ArrowRight");
  await expect(first.getByRole("link").nth(1)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(first.getByRole("link", { name: TICKET_CHIP })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(first.getByRole("link").nth(1)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(first.getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(readroomPath("bump-allocator"));

  // The task's source row: ▼ enters it, ▶ stays on the source link (the ticket
  // chip is gone — the ticket row lives under the files). Another ▼ lands on it.
  await expect(focusedBody(page)).toBeFocused();
  const task = page.getByRole("region", { name: BUMP });
  await page.keyboard.press("ArrowDown");
  await expect(task.getByRole("link", { name: /SmpAllocator\.zig$/ })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(task.getByRole("link", { name: /SmpAllocator\.zig$/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(task.getByRole("link", { name: "DOS-3" })).toBeFocused();
});

test("keeps the feed and the task legible", async ({ page }) => {
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });
  await expectMinimumContrast(feed.getByRole("link", { name: BUMP }));
  await expectMinimumContrast(feed.getByText("COLLECTING").first());
  await expectMinimumContrast(feed.getByText("2D AGO · 3 NOTES", { exact: true }));

  await feed.getByRole("button", { name: "TOP", exact: true }).click();
  await feed.getByRole("link", { name: RETRY }).click();
  const task = page.getByRole("region", { name: RETRY });
  await expectMinimumContrast(task.getByText(/DEADLINE \d{4}/));
  await expectMinimumContrast(task.getByRole("heading", { name: "WRITE-UP" }));
});

test("answers an unknown task with the shell 404", async ({ page }) => {
  await page.goto(readroomPath("no-such-task"));

  await expect(page.getByRole("heading", { level: 1, name: "PATH NOT FOUND" })).toBeVisible();
  await expect(page.getByRole("menubar")).toBeVisible();
});

test("has no accessibility violations", async ({ page }) => {
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  await expectNoViolations(page, READROOM_PATH);

  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("button", {
      name: "TOP",
      exact: true,
    })
    .click();
  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: RECURSIVE })
    .click();
  await expect(page.getByRole("region", { name: RECURSIVE })).toBeVisible();
  await expectNoViolations(page, "task with sealed notes");

  await page.goto(readroomPath("retry-loop"));
  await expect(page.getByRole("region", { name: RETRY })).toBeVisible();
  await expectNoViolations(page, "published task with the report");
});

test("has no accessibility violations as a member", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(readroomPath("bump-allocator"));
  await expect(page.getByRole("region", { name: BUMP })).toBeVisible();
  await expectNoViolations(page, "member task with own notes");
});

test("opens a lead profile over the feed and closes back to the card", async ({ page }) => {
  await page.goto(READROOM_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });
  // Grace leads the first Active task.
  await feed.getByRole("button", { name: "ACTIVE", exact: true }).click();
  const lead = feed.getByRole("article").first().getByRole("link", { name: "grace" });
  await expect(lead).toHaveAttribute("href", "/members/grace");

  // The profile link uses a client navigation instead of reloading the shell.
  await page.evaluate(() => {
    (window as unknown as { sjSpaMarker?: number }).sjSpaMarker = 1;
  });
  await lead.click();
  await expect(page).toHaveURL("/members/grace");
  await expect(layers(page)).toHaveCount(2);
  const layerTops = await layers(page).evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().top),
  );
  expect(layerTops[0]).toBeLessThan(layerTops[1] ?? 0);
  await expect(page.getByRole("region", { name: "MEMBERS.EXE" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "grace" })).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { sjSpaMarker?: number }).sjSpaMarker),
  ).toBe(1);

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(READROOM_PATH);
  await expect(layers(page)).toHaveCount(1);
  await expect(
    feed.getByRole("article").first().getByRole("link", { name: "grace" }),
  ).toBeFocused();

  // The [X] button closes the same way.
  await feed.getByRole("article").first().getByRole("link", { name: "grace" }).click();
  await expect(page).toHaveURL("/members/grace");
  await layers(page).last().getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(READROOM_PATH);
  await expect(layers(page)).toHaveCount(1);
  await expect(
    feed.getByRole("article").first().getByRole("link", { name: "grace" }),
  ).toBeFocused();
});

test("opens a note author profile over the task and returns to the note", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(readroomPath("bump-allocator"));
  await waitForHydration(page);
  const task = page.getByRole("region", { name: BUMP });
  const author = task.getByRole("link", { name: "ada" });
  await expect(author).toHaveAttribute("href", "/members/ada");

  await author.focus();
  await page.keyboard.press(" ");
  await expect(page).toHaveURL("/members/ada");
  await expect(layers(page)).toHaveCount(3);
  await expect(page.getByRole("region", { name: "MEMBERS.EXE" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "ada" })).toBeVisible();
  await expectNoViolations(page, "member layer over a task");

  await page.goBack();
  await expect(page).toHaveURL(readroomPath("bump-allocator"));
  await expect(layers(page)).toHaveCount(2);
  await expect(task.getByRole("link", { name: "ada" })).toBeFocused();
});
