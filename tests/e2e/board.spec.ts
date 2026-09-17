import { expect, test, type Page } from "@playwright/test";
import { DOC_LAYER_ATTR, DOC_TOP_ATTR } from "../../src/features/shell/attributes";
import { DOS_ROW_ATTR } from "../../src/packages/swearjar-dos/attributes";
import { FEED_PATH, threadPath } from "../../src/shared/board/threads";
import { expectNoViolations, waitForHydration } from "./helpers";

const FEED_REGION = "DISCUSSIONS.EXE";
const FILES_REGION = "C:\\SWEARJAR";
const READ_FIRST = "READ FIRST: how this board works";
const CI_CACHE = "CI cache poisoning: how we lost a day";
const layers = (page: Page) => page.locator(`[${DOC_LAYER_ATTR}]`);
// The PanelStack effect focuses the top layer's body and attaches the Esc
// listener; the focus is the sync point for keyboard tests, as the island
// hydrates behind a Suspense boundary after the shell clock already ticks.
const focusedBody = (page: Page) => page.locator(`[${DOC_TOP_ATTR}] [data-dos-scroll]`);

test("renders the hot feed and re-sorts by new", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });
  const cards = feed.getByRole("article");

  await expect(cards).toHaveCount(8);
  await expect(feed.getByText("8 THREADS")).toBeVisible();
  await expect(cards.first()).toContainText("[PINNED]");
  // Hot ends with the quietest thread; new ends with the oldest activity.
  await expect(cards.last()).toContainText("Withdrawn: the weekly call");

  await feed.getByRole("button", { name: "NEW" }).click();
  await expect(page).toHaveURL(`${FEED_PATH}?sort=new`);
  await expect(feed.getByRole("button", { name: "NEW" })).toHaveAttribute("aria-pressed", "true");
  await expect(cards.last()).toContainText("Bikeshed closed: tabs, and here is why");
});

test("filters by tag and board and keeps the state in the URL", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });

  await feed.getByRole("button", { name: "QUESTION" }).first().click();
  await expect(page).toHaveURL(`${FEED_PATH}?tag=question`);
  await expect(feed.getByRole("article")).toHaveCount(2);
  await expect(feed.getByRole("button", { name: "QUESTION" }).first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Board and tag combine into the empty-filter state.
  await feed.getByRole("combobox", { name: "BOARD" }).click();
  await page.getByRole("option", { name: "COMPILER" }).click();
  await expect(page).toHaveURL(`${FEED_PATH}?board=compiler&tag=question`);
  await expect(feed.getByText("NO THREADS MATCH THESE FILTERS.")).toBeVisible();
  await expect(feed.getByText("0 THREADS")).toBeVisible();

  // The state is deep-linkable.
  await page.reload();
  await expect(feed.getByText("NO THREADS MATCH THESE FILTERS.")).toBeVisible();
});

test("a tag on a card filters the feed instead of opening the thread", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });

  const card = feed.getByRole("article").filter({ hasText: CI_CACHE });
  await card.getByRole("button", { name: "TOOLING" }).click();

  await expect(page).toHaveURL(`${FEED_PATH}?tag=tooling`);
  await expect(feed.getByRole("article")).toHaveCount(1);
});

test("the gap between card tags belongs to the stretched link", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const card = page
    .getByRole("article")
    .filter({ hasText: "Why we write our own parsers: a case for recursive descent" });
  await card.scrollIntoViewIfNeeded();
  const first = await card.getByRole("button", { name: "COMPILERS" }).boundingBox();
  const second = await card.getByRole("button", { name: "PROPOSAL" }).boundingBox();
  if (!first || !second) throw new Error("the card with two tags is not rendered");

  // The actions row keeps its gap click-through: the tags are its direct
  // children, so the exact middle between them hits the link stretched under
  // it, not a wrapper raised over it.
  await page.mouse.click((first.x + first.width + second.x) / 2, first.y + first.height / 2);
  await expect(page).toHaveURL(threadPath("handwritten-parsers"));
});

test("walks the feed by rows and remembers the control inside one", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });
  const cards = feed.getByRole("article");

  // From the panel surface, ▲ enters the first row; ▼ steps to the next row.
  await focusedBody(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect(feed.getByRole("combobox", { name: "BOARD" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(feed.getByRole("button", { name: "PROPOSAL" }).first()).toBeFocused();

  // ◀/▶ walk inside the tag row.
  await page.keyboard.press("ArrowRight");
  await expect(feed.getByRole("button", { name: "DECISION" }).first()).toBeFocused();

  // ▼ leaves the row for the first card, ▶ enters its tags.
  await page.keyboard.press("ArrowDown");
  await expect(cards.first().getByRole("link")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(cards.first().getByRole("button").first()).toBeFocused();

  // ▼ steps to the next card; ▲ returns to the control left in the first one.
  await page.keyboard.press("ArrowDown");
  await expect(cards.nth(1).getByRole("link")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(cards.first().getByRole("button").first()).toBeFocused();

  // The walk wraps: ▲ from the first row lands on the last card.
  await focusedBody(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect(feed.getByRole("combobox", { name: "BOARD" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(cards.last().getByRole("link")).toBeFocused();
});

test("walks the thread posts with ▲/▼ and wraps", async ({ page }) => {
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  await expect(focusedBody(page)).toBeFocused();

  const posts = page.locator(`[${DOC_TOP_ATTR}] [${DOS_ROW_ATTR}]`);
  await expect(posts).toHaveCount(3);

  await page.keyboard.press("ArrowDown");
  await expect(posts.nth(0)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(posts.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(posts.nth(2)).toBeFocused();
  // The post walk wraps at both ends.
  await page.keyboard.press("ArrowDown");
  await expect(posts.nth(0)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(posts.nth(2)).toBeFocused();
});

test("opens a thread over the feed and pops back to the focused card", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });
  await feed.getByRole("link", { name: CI_CACHE }).click();

  const thread = page.getByRole("region", { name: CI_CACHE });
  await expect(page).toHaveURL(threadPath("ci-cache-poisoning"));
  await expect(thread).toBeVisible();
  // The thread body takes the keyboard; the feed layer below goes inert.
  await expect(page.locator(`[${DOC_TOP_ATTR}] [data-dos-scroll]`)).toBeFocused();
  await expect(layers(page)).toHaveCount(2);
  await expect(layers(page).first()).toHaveAttribute("inert", "");
  await expect(layers(page).last()).not.toHaveAttribute("inert", "");
  await expect(feed).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(FEED_PATH);
  await expect(page.locator("#thread-card-ci-cache-poisoning")).toBeFocused();
});

test("a thread reached by browser back closes with the feed", async ({ page }) => {
  // Deep link: the thread is the first history entry, so its close pushes the
  // feed instead of going back off the page.
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  await expect(focusedBody(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(FEED_PATH);

  // Push a thread from the feed, then walk history back to the deep-linked
  // entry: there is no pushed-feed entry behind it to go back to.
  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: CI_CACHE })
    .click();
  await expect(page).toHaveURL(threadPath("ci-cache-poisoning"));

  await page.goBack();
  await expect(page).toHaveURL(FEED_PATH);
  await page.goBack();
  await expect(page).toHaveURL(threadPath("read-first"));
  await waitForHydration(page);
  await expect(page.getByRole("region", { name: READ_FIRST })).toBeVisible();
  await expect(focusedBody(page)).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(FEED_PATH);
  await expect(page.getByRole("region", { name: FEED_REGION })).toBeVisible();
});

test("a second Esc does not pop another layer while the close is in flight", async ({ page }) => {
  // A history entry behind the feed gives a runaway second close somewhere to
  // go back to — and keeps the bug visible.
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  await expect(focusedBody(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(FEED_PATH);

  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: CI_CACHE })
    .click();
  await expect(page).toHaveURL(threadPath("ci-cache-poisoning"));
  await expect(focusedBody(page)).toBeFocused();

  // Both presses go out back to back: one close owns the pop.
  await Promise.all([page.keyboard.press("Escape"), page.keyboard.press("Escape")]);

  await expect(page).toHaveURL(FEED_PATH);
  await expect(page.getByRole("region", { name: FEED_REGION })).toBeVisible();
});

test("the thread [X] closes back to the feed", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: /Why we write our own parsers/ })
    .click();

  const thread = page.getByRole("region", { name: /Why we write our own parsers/ });
  await thread.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(FEED_PATH);
});

test("a deep link opens the stack and Tab from the file list reaches the top layer", async ({
  page,
}) => {
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  await expect(page).toHaveTitle(`${READ_FIRST} — Swear Jar Labs`);
  await expect(page.getByRole("region", { name: READ_FIRST })).toBeVisible();

  // The section file stays current on its deep routes.
  const files = page.getByRole("region", { name: FILES_REGION });
  await expect(files.locator("#file-DISCUSSIONS")).toHaveAttribute("aria-current", "true");

  await files.locator("#file-DISCUSSIONS").focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(`[${DOC_TOP_ATTR}] [data-dos-scroll]`)).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(files.locator("#file-DISCUSSIONS")).toBeFocused();

  // A deep-linked thread pushes the feed on close.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(FEED_PATH);
  await expect(page.getByRole("region", { name: FEED_REGION })).toBeVisible();
});

test("renders posts, the empty thread and the locked thread", async ({ page }) => {
  await page.goto(threadPath("read-first"));
  const thread = page.getByRole("region", { name: READ_FIRST });
  await expect(thread.getByText("THREE RULES, AND THE JAR WATCHES ALL OF THEM.")).toBeVisible();
  await expect(thread.getByRole("listitem")).toHaveCount(3);

  await page.goto(threadPath("withdrawn-call"));
  await expect(
    page
      .getByRole("region", { name: "Withdrawn: the weekly call" })
      .getByText("NO POSTS HERE YET."),
  ).toBeVisible();

  await page.goto(threadPath("tabs-vs-spaces"));
  const locked = page.getByRole("region", { name: "Bikeshed closed: tabs, and here is why" });
  await expect(locked.getByText("[LOCKED]").first()).toBeVisible();
  await expect(locked.getByText("THIS THREAD IS LOCKED.")).toBeVisible();
});

test("lays a lone panel flush and steps the stacked thread down", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const margins = (target: Page) =>
    layers(target).evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return { left: style.marginLeft, top: style.marginTop };
      }),
    );

  // The lone feed panel takes the whole workspace: the cascade belongs to a
  // stack, not to the only layer there is.
  expect(await margins(page)).toEqual([{ left: "0px", top: "0px" }]);

  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: CI_CACHE })
    .click();
  await expect(layers(page)).toHaveCount(2);
  const stacked = await margins(page);
  expect(stacked).toHaveLength(2);
  // The base stays whole; the thread steps down and reveals its title bar.
  expect(stacked[0]).toEqual({ left: "0px", top: "0px" });
  expect(stacked[1]?.left).toBe("0px");
  expect(stacked[1]?.top).not.toBe("0px");
});

test("stacks the layers flush on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto(threadPath("read-first"));
  await expect(page.getByRole("region", { name: READ_FIRST })).toBeVisible();

  const margin = await page
    .locator(`[${DOC_TOP_ATTR}]`)
    .evaluate((element) => getComputedStyle(element).marginTop);
  expect(margin).toBe("0px");
});

test("answers an unknown thread with the shell 404", async ({ page }) => {
  await page.goto(threadPath("no-such-thread"));

  await expect(page.getByRole("heading", { level: 1, name: "PATH NOT FOUND" })).toBeVisible();
  await expect(page.getByRole("menubar")).toBeVisible();
});

test("has no accessibility violations", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  await expectNoViolations(page, FEED_PATH);

  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: READ_FIRST })
    .click();
  await expect(page.getByRole("region", { name: READ_FIRST })).toBeVisible();
  await expectNoViolations(page, "thread");
});
