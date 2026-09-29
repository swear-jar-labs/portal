import { expect, test, type Page } from "@playwright/test";
import { DOS_SCROLL_ATTR } from "@swearjar/dos/contracts";
import { DOC_TOP_ATTR } from "../../src/features/shell/attributes";
import { FEED_PATH, threadPath } from "../../src/features/board/model/threads";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const FEED_REGION = "FORUM.EXE";
const FILES_REGION = "C:\\SWEARJAR";
const feed = (page: Page) => page.getByRole("region", { name: FEED_REGION });
const searchBox = (page: Page) => feed(page).getByRole("textbox", { name: "SEARCH" });
const focusedBody = (page: Page) => page.locator(`[${DOC_TOP_ATTR}] [${DOS_SCROLL_ATTR}]`);

async function logoff(page: Page) {
  await page.getByRole("button", { name: "F9 Logoff" }).click();
  await page.getByRole("button", { name: "LOG OFF" }).click();
  await expect(page).toHaveURL("/");
}

async function logonSpa(page: Page, user: string) {
  await page.getByRole("region", { name: FILES_REGION }).locator("#file-LOGON").click();
  await page.getByLabel("Username or email").fill(user);
  await page.getByLabel("Password").fill("secret");
  await page.getByRole("button", { name: "LOG ON" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });
}

test("finds a reply-only phrase and jumps straight to it", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);

  // "fortune cookie" lives only in one reply: the title and the opening post
  // do not hold it.
  await searchBox(page).fill("fortune cookie");
  await expect(page).toHaveURL(`${FEED_PATH}?q=fortune+cookie`);
  await expect(feed(page).getByText("1 THREAD")).toBeVisible();
  await expect(feed(page).getByText("1 MATCH")).toBeVisible();

  const card = feed(page).getByRole("article").filter({
    hasText: "Why we write our own parsers: a case for recursive descent",
  });
  await expect(card).toBeVisible();
  // Both query words highlight inside the fragment; the markup comes from
  // text segments, never from parsed HTML.
  await expect(feed(page).locator("mark")).toHaveCount(2);
  await expect(feed(page).locator("mark").first()).toHaveText("fortune");

  await feed(page).getByRole("link", { name: "Why we write our own parsers" }).click();
  await expect(page).toHaveURL(
    `${threadPath("handwritten-parsers")}#board-post-handwritten-parsers-3`,
  );
  await expect(page.locator("#board-post-handwritten-parsers-3")).toBeFocused();

  // Back closes the thread into the same results; the card takes focus.
  // Forward walks back into the anchored reply.
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(`${FEED_PATH}?q=fortune+cookie`);
  await expect(feed(page).getByRole("article")).toHaveCount(1);
  await expect(page.locator("#thread-card-handwritten-parsers")).toBeFocused();
  await page.goForward();
  await expect(page).toHaveURL(
    `${threadPath("handwritten-parsers")}#board-post-handwritten-parsers-3`,
  );
  await page.goBack();
  await expect(page).toHaveURL(`${FEED_PATH}?q=fortune+cookie`);

  // A deep-linked thread closes into the same filtered feed, not the bare one.
  await page.goto(`${threadPath("handwritten-parsers")}?q=fortune+cookie`);
  await waitForHydration(page);
  // The island hydrates behind Suspense after the shell clock: the focused
  // body proves its listeners answer before Escape goes out.
  await expect(focusedBody(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(`${FEED_PATH}?q=fortune+cookie`);
  await expect(feed(page).getByRole("article")).toHaveCount(1);
  await expectNoViolations(page, "forum search results");
});

test("finds titles and code, and opens a title hit at the head", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);

  await searchBox(page).fill("Bikeshed");
  await expect(feed(page).getByText("1 THREAD")).toBeVisible();
  const card = feed(page).getByRole("article").filter({ hasText: "Bikeshed closed" });
  await expect(card).toBeVisible();
  // The row names its board, the thread author and the match kind.
  await expect(card.getByText("GENERAL", { exact: true })).toBeVisible();
  await expect(card.getByText("TITLE", { exact: true })).toBeVisible();
  await feed(page).getByRole("link", { name: "Bikeshed closed: tabs, and here is why" }).click();
  await expect(page).toHaveURL(threadPath("tabs-vs-spaces"));
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(`${FEED_PATH}?q=Bikeshed`);

  // Code fences are ordinary searchable text.
  await searchBox(page).fill("write_thing(old_buf)");
  await expect(feed(page).getByText("1 THREAD")).toBeVisible();
  await expect(
    feed(page).getByRole("article").filter({ hasText: "Postmortem: heap corruption" }),
  ).toBeVisible();
  await expectNoViolations(page, "forum code search results");
});

test("caps the rows per thread and notes the rest", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);

  // A one-letter query hits the pinned thread four times (title plus three
  // posts): three post rows, and plain text noting the rest — every match
  // stays reachable through the open thread.
  await searchBox(page).fill("a");
  const group = feed(page).getByRole("article").filter({ hasText: "READ FIRST" });
  await expect(group).toHaveCount(3);
  await expect(feed(page).getByText("MORE MATCHES IN THIS THREAD").first()).toBeVisible();
  // The first row is the title hit: it opens the thread at its head.
  await group.first().getByRole("link", { name: "READ FIRST: how this board works" }).click();
  await expect(page).toHaveURL(threadPath("read-first"));
});

test("narrows with board and tag, and keeps ERRATA isolated", async ({ page }) => {
  await page.goto(`${FEED_PATH}?board=errata`);
  await waitForHydration(page);

  await searchBox(page).fill("staging");
  await expect(page).toHaveURL(`${FEED_PATH}?board=errata&q=staging`);
  // Flat post rows: the title hit and the reply hit read as two rows of one
  // thread, and the header still counts threads.
  const results = feed(page).getByRole("article");
  await expect(results).toHaveCount(2);
  await expect(results.first()).toContainText("staging dump");
  await expect(feed(page).getByText("1 THREAD")).toBeVisible();
  await expect(feed(page).getByText("2 MATCHES")).toBeVisible();

  // The same word lives on another board: ERRATA never mixes it in until the
  // board filter is lifted.
  await feed(page).getByRole("combobox", { name: "BOARD" }).click();
  await page.getByRole("option", { name: "ALL BOARDS" }).click();
  await expect(page).toHaveURL(`${FEED_PATH}?q=staging`);
  await expect(feed(page).getByRole("article")).toHaveCount(3);
  await expect(feed(page).getByText("2 THREADS")).toBeVisible();

  // The query half of the state is deep-linkable on its own.
  await page.reload();
  await waitForHydration(page);
  await expect(feed(page).getByRole("article")).toHaveCount(3);
  await expect(searchBox(page)).toHaveValue("staging");
});

test("clears the query, names the empty state and walks history", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);

  await searchBox(page).fill("staging");
  await expect(feed(page).getByRole("article")).toHaveCount(3);
  await expect(feed(page).getByText("2 THREADS")).toBeVisible();

  await searchBox(page).fill("zxqv-no-such-word");
  await expect(page).toHaveURL(`${FEED_PATH}?q=zxqv-no-such-word`);
  await expect(feed(page).getByText("0 THREADS")).toBeVisible();
  await expect(feed(page).getByText("NO MATCHES. TRY FEWER OR DIFFERENT WORDS.")).toBeVisible();

  // Clearing drops the query from the URL and restores the plain feed with
  // its own filters untouched.
  await feed(page).getByRole("button", { name: "CLEAR", exact: true }).click();
  await expect(page).toHaveURL(FEED_PATH);
  await expect(feed(page).getByText("12 THREADS")).toBeVisible();

  // A whitespace query is the plain feed, not a search; CLEAR still drops
  // the raw text from the URL.
  await searchBox(page).fill("   ");
  await expect(feed(page).getByText("12 THREADS")).toBeVisible();
  await feed(page).getByRole("button", { name: "CLEAR", exact: true }).click();
  await expect(page).toHaveURL(FEED_PATH);
});

test("searches session replies and composed threads, and forgets deletions", async ({ page }) => {
  await logon(page);
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const thread = page.getByRole("region", { name: "READ FIRST: how this board works" });

  await thread.getByRole("textbox", { name: "REPLY" }).fill("Zephyr quantizes the moonbeam jar.");
  await thread.getByRole("button", { name: "POST REPLY" }).click();
  await expect(thread.getByRole("article").last()).toContainText("Zephyr quantizes");

  // The mock store dies with a reload, so the feed is reached over SPA
  // navigation: the file list keeps the session memory alive.
  await page.getByRole("region", { name: FILES_REGION }).locator("#file-FORUM").click();
  await expect(page).toHaveURL(FEED_PATH);
  await searchBox(page).fill("zephyr moonbeam");
  await expect(feed(page).getByText("1 THREAD")).toBeVisible();
  await expect(
    feed(page).getByRole("link", { name: "READ FIRST: how this board works" }),
  ).toBeVisible();

  // Deleting the reply removes it from the index in the same session.
  await feed(page).getByRole("link", { name: "READ FIRST: how this board works" }).click();
  const added = thread.getByRole("article").last();
  await added.getByRole("button", { name: "DELETE" }).click();
  await page
    .getByRole("dialog", { name: "DELETE POST" })
    .getByRole("button", { name: "DELETE" })
    .click();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(`${FEED_PATH}?q=zephyr+moonbeam`);
  await expect(feed(page).getByText("0 THREADS")).toBeVisible();
});

test("keeps hidden replies out of the results for strangers", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const target = page.locator("#board-post-read-first-2");
  await target.getByRole("button", { name: "REPORT" }).click();
  const form = page.getByRole("dialog", { name: "REPORT CONTENT" });
  await form.getByRole("textbox", { name: "Reason" }).fill("The drifts reply needs a review.");
  await form.getByRole("button", { name: "SEND REPORT" }).click();
  await expect(target.getByText("REPORT SENT")).toBeVisible();
  await logoff(page);

  await logonSpa(page, "admin");
  await page.getByRole("region", { name: FILES_REGION }).locator("#file-ADMIN").click();
  await page.getByRole("tab", { name: "MODERATION" }).click();
  await page
    .getByRole("textbox", { name: "NEW MODERATOR MESSAGE" })
    .fill("Hidden until corrected.");
  await page.getByRole("button", { name: "HIDE NOW" }).click();
  await expect(page.getByRole("button", { name: "RESTORE" })).toBeVisible();
  await logoff(page);

  // "drifts" lives only in the hidden reply: a stranger finds nothing.
  await logonSpa(page, "ken");
  await page.getByRole("region", { name: FILES_REGION }).locator("#file-FORUM").click();
  await searchBox(page).fill("drifts");
  await expect(feed(page).getByText("0 THREADS")).toBeVisible();
  await logoff(page);

  // The author and the admin still find their own material.
  await logonSpa(page, "grace");
  await page.getByRole("region", { name: FILES_REGION }).locator("#file-FORUM").click();
  await searchBox(page).fill("drifts");
  await expect(feed(page).getByText("1 THREAD")).toBeVisible();
  await logoff(page);

  await logonSpa(page, "admin");
  await page.getByRole("region", { name: FILES_REGION }).locator("#file-FORUM").click();
  await searchBox(page).fill("drifts");
  await expect(feed(page).getByText("1 THREAD")).toBeVisible();
});

test("reaches the search box and the jumps with the arrows", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);

  await expect(async () => {
    await focusedBody(page).focus();
    await page.keyboard.press("ArrowDown");
    await expect(feed(page).getByRole("combobox", { name: "BOARD" })).toBeFocused({
      timeout: 1_000,
    });
  }).toPass();
  // The search box rides the board row now: ▶ steps from the board into it.
  await page.keyboard.press("ArrowRight");
  await expect(searchBox(page)).toBeFocused();

  // The field keeps ←/→ for the caret (kit contract), so clearing with the
  // keyboard is text editing: select all, delete, and the plain feed returns.
  await searchBox(page).fill("heap");
  await expect(feed(page).getByText("1 THREAD")).toBeVisible();
  await searchBox(page).press("ControlOrMeta+a");
  await searchBox(page).press("Backspace");
  await expect(page).toHaveURL(FEED_PATH);
  await expect(feed(page).getByText("12 THREADS")).toBeVisible();
  await expectNoViolations(page, "forum search keyboard");
});
